# Bucket India — Dropshipping Platform

React + Parcel + Supabase seller/vendor marketplace.

## Stack
- React 19
- Parcel 2
- React Router
- Supabase Auth + Postgres + RLS

## Local setup
1. `cp .env.example .env`
2. Put the Supabase project URL and publishable key in `.env`.
3. `npm install`
4. `npm run dev`
5. `npm run build`

Parcel reads `.env` variables and exposes them through `process.env.*`. Never put a Supabase service-role/secret key in this app.

## Workspaces

### Seller
- Marketplace product discovery
- Search/filter
- Margin calculation (fixed or percentage)
- Seller catalog
- Shopify store records
- Order view
- Shipping configuration

### Vendor
- Product CRUD
- Inventory and status
- Seller-facing marketplace catalog
- Fulfillment order queue
- Order status updates
- Shipping configuration

## Integration boundary
The dashboard is wired to the Supabase data model. A real Shopify OAuth/product/order sync requires a Shopify app client ID/secret and server-side callback/token handling. Those secrets must live in a Supabase Edge Function or another server-side environment, not in React. The current Store screen therefore manages the store connection record safely without pretending that an API token is available.

## Supabase
Project: `qpcvesdlfqheigbzxbjr`

Tables: `profiles`, `vendors`, `stores`, `products`, `listings`, `orders`, `shipping_configs`.
