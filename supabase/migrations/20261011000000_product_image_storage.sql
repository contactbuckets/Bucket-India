-- Public product images are separate from the private KYC image bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 10485760, array['image/webp'])
on conflict (id) do update
set public = true,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/webp'];

drop policy if exists "product images owner upload" on storage.objects;
create policy "product images owner upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "product images owner update" on storage.objects;
create policy "product images owner update"
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "product images owner delete" on storage.objects;
create policy "product images owner delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
