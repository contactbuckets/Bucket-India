create table if not exists public.seller_settings (
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
  auto_confirm_orders boolean not null default false,
  auto_confirm_cod boolean not null default false,
  auto_confirm_prepaid boolean not null default true,
  confirmation_delay_minutes integer not null default 0 check (confirmation_delay_minutes between 0 and 1440),
  notify_new_orders boolean not null default true,
  notify_ndr boolean not null default true,
  notify_rto boolean not null default true,
  notify_settlements boolean not null default true,
  shipping_provider text,
  default_shipping_mode text not null default 'standard' check (default_shipping_mode in ('standard','express')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seller_settings enable row level security;
drop policy if exists "seller_settings_select_own" on public.seller_settings;
drop policy if exists "seller_settings_insert_own" on public.seller_settings;
drop policy if exists "seller_settings_update_own" on public.seller_settings;
drop policy if exists "seller_settings_delete_own" on public.seller_settings;
create policy "seller_settings_select_own" on public.seller_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "seller_settings_insert_own" on public.seller_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "seller_settings_update_own" on public.seller_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "seller_settings_delete_own" on public.seller_settings for delete to authenticated using ((select auth.uid()) = user_id);
create index if not exists seller_settings_user_id_idx on public.seller_settings(user_id);
