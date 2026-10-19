-- Remove a legacy remittance policy that compared auth.uid() directly to vendor_id.
-- Vendor access is correctly checked through vendors.owner_id by remittances_vendor_read.
DROP POLICY IF EXISTS "Vendor view remittances" ON public.remittances;
