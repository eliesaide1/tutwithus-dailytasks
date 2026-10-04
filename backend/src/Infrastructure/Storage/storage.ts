// Object storage for task attachments (DigitalOcean Spaces — S3 compatible).
//
// Files never pass through this server: the browser uploads straight to Spaces with a
// short-lived presigned PUT, and downloads through a short-lived presigned GET. The API
// only ever handles the metadata. That keeps a 40 MB PDF away from a 512 MB instance.
//
// The feature is optional: with no SPACES_* variables set, isStorageConfigured() is
// false and the attachment endpoints answer 503 instead of crashing at boot.
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../Config/config";

const UPLOAD_URL_TTL = 300; // 5 minutes to start the upload
const DOWNLOAD_URL_TTL = 300; // 5 minutes to follow a download redirect

let client: S3Client | null = null;

export const isStorageConfigured = () => Boolean(config.spaces);

function s3() {
  const s = config.spaces;
  if (!s) throw new Error("Object storage is not configured (SPACES_* environment variables).");
  client ??= new S3Client({
    endpoint: s.endpoint,
    region: s.region,
    credentials: { accessKeyId: s.key, secretAccessKey: s.secret },
    // Spaces uses virtual-hosted-style URLs, same as S3.
    forcePathStyle: false,
  });
  return client;
}

const bucket = () => config.spaces!.bucket;

/** Presigned PUT the browser uploads to. The key is chosen by the server, never the client. */
export async function presignUpload(key: string, contentType: string) {
  const url = await getSignedUrl(s3(), new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }), {
    expiresIn: UPLOAD_URL_TTL,
  });
  return { url, expiresIn: UPLOAD_URL_TTL };
}

/**
 * Presigned GET. `filename` sets Content-Disposition so the browser downloads under the
 * original name rather than the storage key.
 */
export function presignDownload(key: string, filename: string, inline = false) {
  const disposition = `${inline ? "inline" : "attachment"}; filename="${filename.replace(/["\\]/g, "")}"`;
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: key, ResponseContentDisposition: disposition }), {
    expiresIn: DOWNLOAD_URL_TTL,
  });
}

/** Confirms the browser's upload actually landed, and reports its true size. */
export async function headObject(key: string) {
  try {
    const out = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { size: out.ContentLength ?? 0, contentType: out.ContentType ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

export async function deleteObject(key: string) {
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch {
    // A missing object is already in the desired state; never block the DB cleanup.
  }
}
