-- Tighten client privileges on orders and allow trusted Shopify webhook updates.
-- Row-level policies and guard_order_updates still enforce per-role ownership/status rules.

revoke insert, update, delete, truncate, references, trigger on table public.orders from authenticated;

-- Remove any old column-level UPDATE grants on fields that must remain server-owned.
do $$
declare
  c record;
begin
  for c in
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name not in (
        'customer_name','customer_phone','shipping_address','status','confirmed_at',
        'cancelled_at','error_message','updated_at','awb','courier','packed_at',
        'shipped_at','delivered_at','rto_at','last_event_at'
      )
  loop
    execute format('revoke update (%I) on table public.orders from authenticated', c.column_name);
  end loop;
end;
$$;

grant select on table public.orders to authenticated;
grant update (
  customer_name,
  customer_phone,
  shipping_address,
  status,
  confirmed_at,
  cancelled_at,
  error_message,
  updated_at,
  awb,
  courier,
  packed_at,
  shipped_at,
  delivered_at,
  rto_at,
  last_event_at
) on table public.orders to authenticated;

create or replace function public.guard_order_updates()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_role text;
begin
  -- Shopify webhooks and trusted server-side jobs use the service-role JWT.
  -- The JWT claim remains available even though this trigger function is SECURITY DEFINER.
  if coalesce(auth.role(), current_setting('request.jwt.claim.role', true)) = 'service_role' then
    return new;
  end if;

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
      elsif new.status = 'cancelled' and old.status not in ('pending','confirmed','unprocessable') then
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
