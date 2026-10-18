-- Trigger functions are invoked by PostgreSQL and must not be exposed as callable RPCs.
revoke execute on function public.guard_order_updates() from public, anon, authenticated;
revoke execute on function public.guard_kyc_owner_updates() from public, anon, authenticated;
