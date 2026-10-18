-- KYC document metadata is private and owner-scoped. Remove unnecessary table-wide privileges.
revoke all privileges on table public."Bucket img" from anon;
revoke truncate, references, trigger on table public."Bucket img" from authenticated;

-- Enforce the same upload constraints at Storage, not only in the browser UI.
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf']
 where id = 'img';

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'img') then
    raise exception 'Expected private KYC storage bucket "img" was not found';
  end if;
end;
$$;