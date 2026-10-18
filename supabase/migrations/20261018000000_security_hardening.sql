-- Bucket India security hardening: profile roles, KYC approvals, and order integrity.
-- Apply only after reviewing in staging. Auth leaked-password protection is configured in Supabase Auth settings, not SQL.


-- Remove the accidental public/anon access observed on these private account/order tables.
revoke all privileges on table public.profiles from anon;
revoke all privileges on table public.kyc_profiles from anon;
revoke all privileges on table public.orders from anon;

-- Profiles: users can edit their own contact details, never their role or identity.
drop policy if exists profiles_self on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
revoke insert, update, delete, truncate, references, trigger on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, phone, updated_at) on table public.profiles to authenticated;

create or replace function public.admin_set_profile_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_role not in ('seller', 'vendor', 'admin') then
    raise exception 'Invalid profile role' using errcode = '22023';
  end if;
  update public.profiles
     set role = p_role, updated_at = now()
   where id = p_user_id;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke execute on function public.admin_set_profile_role(uuid, text) from public, anon;
grant execute on function public.admin_set_profile_role(uuid, text) to authenticated;

-- KYC: no anonymous access, no owner-controlled status/notes, and only documented fields are writable.
drop policy if exists kyc_owner_all on public.kyc_profiles;
create policy kyc_owner_select on public.kyc_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy kyc_owner_insert on public.kyc_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy kyc_owner_update on public.kyc_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke insert, update, delete, truncate, references, trigger on table public.kyc_profiles from authenticated;
grant select on table public.kyc_profiles to authenticated;
grant insert (
  user_id, entity_type, legal_name, business_name, pan_last4, gstin, phone,
  address, pincode, completion, proof_image_url, pan_image_url,
  bank_proof_image_url, proof_storage_path, pan_storage_path,
  bank_proof_storage_path, updated_at
) on public.kyc_profiles to authenticated;
grant update (
  entity_type, legal_name, business_name, pan_last4, gstin, phone,
  address, pincode, completion, proof_image_url, pan_image_url,
  bank_proof_image_url, proof_storage_path, pan_storage_path,
  bank_proof_storage_path, updated_at
) on public.kyc_profiles to authenticated;

create or replace function public.guard_kyc_owner_updates()
returns trigger
language plpgsql
set search_path = public, auth
as $$
begin
  -- Trusted SECURITY DEFINER RPCs execute as the function owner; direct API calls do not.
  if current_user = 'postgres' or public.is_admin() then
    return new;
  end if;
  if auth.uid() is null or auth.uid() <> old.user_id then
    raise exception 'KYC row access denied' using errcode = '42501';
  end if;
  if new.user_id is distinct from old.user_id
     or new.status is distinct from old.status
     or new.notes is distinct from old.notes then
    raise exception 'Only an administrator can change KYC owner, status, or review notes' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_kyc_owner_updates_trigger on public.kyc_profiles;
create trigger guard_kyc_owner_updates_trigger
before update on public.kyc_profiles
for each row execute function public.guard_kyc_owner_updates();

create or replace function public.submit_kyc_profile()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  update public.kyc_profiles
     set status = 'submitted', updated_at = now()
   where user_id = auth.uid()
     and status <> 'verified';
  if not found then
    raise exception 'KYC profile not found or already verified' using errcode = 'P0002';
  end if;
end;
$$;
revoke execute on function public.submit_kyc_profile() from public, anon;
grant execute on function public.submit_kyc_profile() to authenticated;

create or replace function public.admin_set_kyc_status(p_kyc_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_status not in ('pending', 'submitted', 'verified', 'action_required', 'rejected') then
    raise exception 'Invalid KYC status' using errcode = '22023';
  end if;
  update public.kyc_profiles
     set status = p_status,
         notes = case when p_status = 'verified' then 'KYC approved by admin'
                      when p_status in ('rejected', 'action_required') then 'KYC requires changes after admin review'
                      else notes end,
         updated_at = now()
   where id = p_kyc_id;
  if not found then
    raise exception 'KYC profile not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke execute on function public.admin_set_kyc_status(uuid, text) from public, anon;
grant execute on function public.admin_set_kyc_status(uuid, text) to authenticated;

-- Orders: anonymous access removed; keep existing admin capabilities but enforce role-specific
-- write allowlists in the database so direct API calls cannot alter ownership or financial values.
drop policy if exists orders_seller_delete on public.orders;
-- Order creation is server-originated (Shopify/webhook/service role) or admin-only; never trust client-supplied amounts/vendor ownership.
drop policy if exists orders_seller_insert on public.orders;

create or replace function public.guard_order_updates()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_role text;
begin
  if public.is_admin() then
    return new;
  end if;

  select p.role into actor_role
    from public.profiles p
   where p.id = auth.uid();

  if actor_role = 'seller' then
    if old.seller_id is distinct from auth.uid() then
      raise exception 'Seller may update only their own orders' using errcode = '42501';
    end if;
    if (to_jsonb(new) - array['customer_name','customer_phone','shipping_address','status','confirmed_at','cancelled_at','error_message','updated_at'])
       is distinct from
       (to_jsonb(old) - array['customer_name','customer_phone','shipping_address','status','confirmed_at','cancelled_at','error_message','updated_at']) then
      raise exception 'Seller cannot change order ownership, financial, or fulfillment fields' using errcode = '42501';
    end if;
    if new.status is distinct from old.status then
      if new.status = 'confirmed' and old.status <> 'pending' then
        raise exception 'Only pending orders can be confirmed' using errcode = '42501';
      elsif new.status = 'cancelled' and old.status not in ('pending','confirmed') then
        raise exception 'This order can no longer be cancelled by the seller' using errcode = '42501';
      elsif new.status not in ('confirmed','cancelled') then
        raise exception 'Seller cannot set this order status' using errcode = '42501';
      end if;
    end if;
    return new;
  elsif actor_role = 'vendor' then
    if not exists (
      select 1 from public.vendors v
       where v.id = old.vendor_id and v.owner_id = auth.uid()
    ) or old.status = 'pending' then
      raise exception 'Vendor may update only assigned, confirmed orders' using errcode = '42501';
    end if;
    if (to_jsonb(new) - array['status','awb','courier','packed_at','shipped_at','delivered_at','cancelled_at','rto_at','last_event_at','error_message','updated_at'])
       is distinct from
       (to_jsonb(old) - array['status','awb','courier','packed_at','shipped_at','delivered_at','cancelled_at','rto_at','last_event_at','error_message','updated_at']) then
      raise exception 'Vendor cannot change order ownership, customer, or financial fields' using errcode = '42501';
    end if;
    if new.status is distinct from old.status
       and new.status not in ('confirmed','packed','shipped','out_for_delivery','delivered','ndr','rto','cancelled') then
      raise exception 'Vendor cannot set this order status' using errcode = '42501';
    end if;
    return new;
  end if;

  raise exception 'Order update not permitted' using errcode = '42501';
end;
$$;
drop trigger if exists guard_order_updates_trigger on public.orders;
create trigger guard_order_updates_trigger
before update on public.orders
for each row execute function public.guard_order_updates();

-- These helpers are only needed by authenticated application policies/functions.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.current_vendor_id() from public, anon;
grant execute on function public.current_vendor_id() to authenticated;

