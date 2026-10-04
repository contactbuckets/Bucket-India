insert into storage.buckets (id,name,public)
values ('img','img',false)
on conflict (id) do update set public=false;

alter table public."Bucket img"
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists kyc_profile_id uuid references public.kyc_profiles(id) on delete cascade,
  add column if not exists document_type text,
  add column if not exists storage_path text,
  add column if not exists proof_image_url text,
  add column if not exists proof_storage_path text;

alter table public.kyc_profiles
  add column if not exists proof_image_url text,
  add column if not exists pan_image_url text,
  add column if not exists bank_proof_image_url text,
  add column if not exists proof_storage_path text,
  add column if not exists pan_storage_path text,
  add column if not exists bank_proof_storage_path text;

alter table public."Bucket img" enable row level security;

drop policy if exists "kyc images owner select" on public."Bucket img";
create policy "kyc images owner select" on public."Bucket img"
for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "kyc images owner insert" on public."Bucket img";
create policy "kyc images owner insert" on public."Bucket img"
for insert to authenticated with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "kyc images owner update" on public."Bucket img";
create policy "kyc images owner update" on public."Bucket img"
for update to authenticated using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "kyc images owner delete" on public."Bucket img";
create policy "kyc images owner delete" on public."Bucket img"
for delete to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "kyc storage authenticated upload" on storage.objects;
create policy "kyc storage authenticated upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'img' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "kyc storage authenticated update" on storage.objects;
create policy "kyc storage authenticated update" on storage.objects
for update to authenticated
using (bucket_id = 'img' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'img' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "kyc storage authenticated delete" on storage.objects;
create policy "kyc storage authenticated delete" on storage.objects
for delete to authenticated
using (bucket_id = 'img' and (storage.foldername(name))[1] = auth.uid()::text);
