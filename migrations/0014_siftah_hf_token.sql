-- Allow admins to override the Hugging Face API token without a redeploy.
alter table siftah_admin_settings
  add column if not exists hf_token text;

comment on column siftah_admin_settings.hf_token is
  'Optional Hugging Face API token override. When set, used instead of HUGGINGFACE_API_TOKEN / HF_TOKEN env vars.';
