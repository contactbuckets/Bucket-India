-- Restrict application roles to ordinary row-level operations.
-- RLS policies remain the source of row-level authorization.
-- Keep existing SELECT grants (including anonymous marketplace reads) intact.

REVOKE TRUNCATE, TRIGGER, REFERENCES
ON TABLE
  public.admin_user_controls,
  public.listings,
  public.orders,
  public.products,
  public.profiles,
  public.remittances,
  public.shipments,
  public.vendor_shipping_connections,
  public.vendors
FROM anon, authenticated;

-- Unauthenticated clients must not write application/business data.
-- Keep SELECT grants unchanged to preserve any public marketplace reads.
REVOKE INSERT, UPDATE, DELETE
ON TABLE
  public.admin_user_controls,
  public.listings,
  public.orders,
  public.products,
  public.profiles,
  public.remittances,
  public.shipments,
  public.vendor_shipping_connections,
  public.vendors
FROM anon;
