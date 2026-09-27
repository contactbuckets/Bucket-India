create table if not exists public.shopify_webhook_events (
  id uuid primary key default gen_random_uuid(),
  shop_domain text not null,
  event_id text not null unique,
  topic text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received','processed','ignored','error')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists shopify_webhook_events_shop_topic_idx
  on public.shopify_webhook_events(shop_domain, topic, received_at desc);

alter table public.shopify_webhook_events enable row level security;