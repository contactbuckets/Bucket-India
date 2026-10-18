-- Preserve all Shopify line items and keep them server-owned.
alter table public.orders
  add column if not exists line_items jsonb not null default '[]'::jsonb;

comment on column public.orders.line_items is
  'Shopify line-item snapshot used for multi-item order visibility and vendor cost reconciliation; written by trusted server integrations.';