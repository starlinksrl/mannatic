import { supabase, getServiceSupabase } from '@/lib/supabase';

const BUCKET_NAME = 'attachments';
let bucketChecked = false;

export async function ensureAttachmentsBucket(): Promise<string> {
  if (bucketChecked) return BUCKET_NAME;
  try {
    const client = getServiceSupabase();
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets?.some(b => b.name === BUCKET_NAME);
    if (!exists) {
      await client.storage.createBucket(BUCKET_NAME, {
        public: false, // Bucket privato
        fileSizeLimit: 52428800, // 50MB
      });
    }
    bucketChecked = true;
  } catch (err) {
    console.warn('Auto-create private bucket notice:', err);
  }
  return BUCKET_NAME;
}

export async function getSignedFileUrl(path: string, expiresInSeconds: number = 60 * 60 * 24 * 365): Promise<string> {
  try {
    const client = getServiceSupabase();
    // If full URL was stored, extract path relative to bucket
    let relativePath = path;
    if (path.includes('/attachments/')) {
      relativePath = path.split('/attachments/')[1];
    }
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .createSignedUrl(relativePath, expiresInSeconds);
    if (error || !data?.signedUrl) {
      const { data: fallback } = client.storage.from(BUCKET_NAME).getPublicUrl(relativePath);
      return fallback.publicUrl;
    }
    return data.signedUrl;
  } catch (e) {
    console.error('Error generating signed URL:', e);
    return path;
  }
}

export async function uploadFileToSupabase(
  fileOrBase64: File | string | Buffer,
  fileName: string,
  folder: string = 'attachments'
): Promise<{ url: string; path: string; error?: string }> {
  try {
    const bucket = await ensureAttachmentsBucket();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const path = `${folder}/${Date.now()}_${cleanFileName}`;

    let body: any;
    let contentType = 'application/octet-stream';

    if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
      const parts = fileOrBase64.split(';base64,');
      const header = parts[0];
      contentType = header.replace('data:', '');
      const base64Data = parts[1];
      body = Buffer.from(base64Data, 'base64');
    } else if (typeof fileOrBase64 === 'string' && fileOrBase64.length > 0) {
      body = Buffer.from(fileOrBase64, 'utf-8');
      contentType = 'text/plain';
    } else if (fileOrBase64 instanceof File) {
      body = fileOrBase64;
      contentType = fileOrBase64.type || contentType;
    } else {
      body = fileOrBase64;
    }

    const client = getServiceSupabase();
    const { error: uploadErr } = await client.storage
      .from(bucket)
      .upload(path, body, { contentType, upsert: true });

    if (uploadErr) {
      console.error('Supabase Private Storage Upload Error:', uploadErr);
      return { url: '', path: '', error: uploadErr.message };
    }

    // Genera URL firmato sicuro per il bucket privato
    const signedUrl = await getSignedFileUrl(path);
    return {
      url: signedUrl,
      path,
    };
  } catch (error: any) {
    console.error('Error uploading file to Supabase private storage:', error);
    return { url: '', path: '', error: error?.message || 'Upload failed' };
  }
}
