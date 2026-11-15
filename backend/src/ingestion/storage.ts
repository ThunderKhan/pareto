import { createClient } from "@supabase/supabase-js";
import type { CheckedResume } from "./parse";

export const RESUME_BUCKET = "pareto-private-resumes";
export const RESUME_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export class StorageFailure extends Error {
  constructor(public code: "STORAGE_UNCONFIGURED" | "BUCKET_NOT_PRIVATE" |
    "BUCKET_MISSING" | "STORAGE_FAILED", message: string) { super(message); }
}

export type ResumeStorage = {
  upload(key: string, file: CheckedResume): Promise<void>;
  read(key: string): Promise<Buffer>;
  signedUrl(key: string): Promise<string>;
  remove(key: string): Promise<void>;
};

function serverClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) ||
      !secret || secret.startsWith("sb_publishable_")) {
    throw new StorageFailure("STORAGE_UNCONFIGURED",
      "Server-side Supabase Storage credentials are not configured.");
  }
  // Secret remains server-only. No browser client or public key can access files.
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function setupPrivateResumeBucket() {
  const client = serverClient();
  const current = await client.storage.getBucket(RESUME_BUCKET);
  if (current.data) {
    if (current.data.public) throw new StorageFailure("BUCKET_NOT_PRIVATE",
      "The resume Storage bucket must be private. Uploads are disabled.");
    return { created: false, bucket: RESUME_BUCKET };
  }
  // Only the administrator invokes this explicit setup script. Never
  // automatically create buckets during a public upload request.
  const created = await client.storage.createBucket(RESUME_BUCKET, {
    public: false, fileSizeLimit: 4 * 1024 * 1024, allowedMimeTypes: RESUME_MIME_TYPES,
  });
  if (created.error) throw new StorageFailure("STORAGE_FAILED",
    "Could not create the private resume Storage bucket.");
  return { created: true, bucket: RESUME_BUCKET };
}

export function supabaseResumeStorage(): ResumeStorage {
  const client = serverClient();
  const bucket = client.storage.from(RESUME_BUCKET);
  const privateOnly = async () => {
    const { data, error } = await client.storage.getBucket(RESUME_BUCKET);
    if (error || !data) throw new StorageFailure("BUCKET_MISSING",
      "The private resume Storage bucket is unavailable. Run the documented setup command.");
    if (data.public) throw new StorageFailure("BUCKET_NOT_PRIVATE",
      "The resume bucket is public. Private uploads and downloads are disabled.");
  };
  return {
    async upload(key, file) {
      await privateOnly();
      const { error } = await bucket.upload(key, file.bytes, {
        contentType: file.mimeType, upsert: false, cacheControl: "0",
      });
      if (error) throw new StorageFailure("STORAGE_FAILED", "Secure upload failed.");
    },
    async read(key) {
      await privateOnly();
      const { data, error } = await bucket.download(key);
      if (error || !data) throw new StorageFailure("STORAGE_FAILED", "Stored resume could not be read.");
      const dataBytes = Buffer.from(await data.arrayBuffer());
      if (dataBytes.length > 4 * 1024 * 1024) throw new StorageFailure("STORAGE_FAILED",
        "Stored resume exceeds the supported size.");
      return dataBytes;
    },
    async signedUrl(key) {
      await privateOnly();
      const { data, error } = await bucket.createSignedUrl(key, 60, { download: true });
      if (error || !data?.signedUrl) throw new StorageFailure("STORAGE_FAILED",
        "Could not grant short-lived access to this private resume.");
      return data.signedUrl;
    },
    async remove(key) {
      // A best-effort rollback path; never try to list or delete foreign owners.
      const { error } = await bucket.remove([key]);
      if (error) throw new StorageFailure("STORAGE_FAILED", "Secure cleanup failed.");
    },
  };
}
