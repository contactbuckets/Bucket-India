create table if not exists public.vendor_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  billing_address jsonb not null default '{}'::jsonb,
  gstin text,
  gst_legal_name text,
  bank_account_name text,
  bank_account_number text,
  bank_ifsc text,
  bank_name text,
  bank_verified boolean not null default false,
  default_shipping_provider text,
  default_shipping_mode text not null default 'standard' check (default_shipping_mode in ('standard','express')),
  notify_new_orders boolean not null default true,
  notify_low_stock boolean not null default true,
  notify_ndr boolean not null default true,
  notify_rto boolean not null default true,
  notify_settlements boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.vendor_shipping_connections (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  provider text not null,
  connection_mode text not null default 'pool' check (connection_mode in ('pool','api')),
  enabled boolean not null default true,
  account_label text,
  api_key_last4 text,
  secret_last4 text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(vendor_id, provider)
);

alter table public.vendor_settings enable row level security;
alter table public.vendor_shipping_connections enable row level security;

create or replace function public.current_vendor_id() returns uuid
language sql stable
as $$ select id from public.vendors where owner_id=(select auth.uid()) limit 1 $$;

drop policy if exists "vendor_settings_select_own" on public.vendor_settings;
drop policy if exists "vendor_settings_insert_own" on public.vendor_settings;
drop policy if exists "vendor_settings_update_own" on public.vendor_settings;
create policy "vendor_settings_select_own" on public.vendor_settings for select to authenticated using (user_id=(select auth.uid()));
create policy "vendor_settings_insert_own" on public.vendor_settings for insert to authenticated with check (user_id=(select auth.uid()));
create policy "vendor_settings_update_own" on public.vendor_settings for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

drop policy if exists "vendor_shipping_connections_select_own" on public.vendor_shipping_connections;
drop policy if exists "vendor_shipping_connections_insert_own" on public.vendor_shipping_connections;
drop policy if exists "vendor_shipping_connections_update_own" on public.vendor_shipping_connections;
drop policy if exists "vendor_shipping_connections_delete_own" on public.vendor_shipping_connections;
create policy "vendor_shipping_connections_select_own" on public.vendor_shipping_connections for select to authenticated using (vendor_id=public.current_vendor_id());
create policy "vendor_shipping_connections_insert_own" on public.vendor_shipping_connections for insert to authenticated with check (vendor_id=public.current_vendor_id());
create policy "vendor_shipping_connections_update_own" on public.vendor_shipping_connections for update to authenticated using (vendor_id=public.current_vendor_id()) with check (vendor_id=public.current_vendor_id());
create policy "vendor_shipping_connections_delete_own" on public.vendor_shipping_connections for delete to authenticated using (vendor_id=public.current_vendor_id());

create index if not exists vendor_settings_user_id_idx on public.vendor_settings(user_id);
create index if not exists vendor_shipping_connections_vendor_id_idx on public.vendor_shipping_connections(vendor_id);