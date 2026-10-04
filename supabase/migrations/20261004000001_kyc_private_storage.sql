update storage.buckets set public=false where id='img';

alter table public."Bucket img"
  add column if not exists proof_storage_path text;

alter table public.kyc_profiles
  add column if not exists proof_storage_path text,
  add column if not exists pan_storage_path text,
  add column if not exists bank_proof_storage_path text;

update public.kyc_profiles kp
set pan_storage_path = bi.storage_path
from public."Bucket img" bi
where bi.kyc_profile_id = kp.id
  and bi.document_type = 'pan'
  and bi.storage_path is not null;

update public.kyc_profiles kp
set bank_proof_storage_path = bi.storage_path
from public."Bucket img" bi
where bi.kyc_profile_id = kp.id
  and bi.document_type = 'bank_proof'
  and bi.storage_path is not null;

update public.kyc_profiles kp
set proof_storage_path = coalesce(kp.pan_storage_path, kp.bank_proof_storage_path),
    proof_image_url = null,
    pan_image_url = null,
    bank_proof_image_url = null;
