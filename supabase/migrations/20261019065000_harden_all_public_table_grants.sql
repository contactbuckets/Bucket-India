-- Extend application-role privilege hardening to every current public base table.
-- Keep SELECT grants unchanged; RLS and existing policies continue to control row visibility.
-- Anonymous clients must not write application data, and app roles must not have table-admin privileges.

DO $$
DECLARE
  tbl record;
BEGIN
  FOR tbl IN
    SELECT format('%I.%I', n.nspname, c.relname) AS qualified_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format(
      'REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE %s FROM anon, authenticated',
      tbl.qualified_name
    );

    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE ON TABLE %s FROM anon',
      tbl.qualified_name
    );
  END LOOP;
END
$$;
