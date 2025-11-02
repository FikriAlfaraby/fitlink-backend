import { StorageClient } from '@supabase/storage-js';

export function createSupabaseStorage() {
  const STORAGE_URL = `${process.env.SUPABASE_URL}/storage/v1`;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!STORAGE_URL || !SERVICE_KEY) {
    throw new Error('Supabase Storage configuration missing');
  }

  return new StorageClient(STORAGE_URL, {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  });
}
