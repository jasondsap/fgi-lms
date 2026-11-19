// =============================================================================
// S3 client — presigned URL generation for secure PDF downloads
// =============================================================================
import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME || 'fgi-resources';
const EXPIRY  = parseInt(process.env.S3_PRESIGNED_URL_EXPIRY || '3600', 10);

/**
 * Generate a time-limited presigned URL for a private S3 object.
 * Call this in API routes when returning a resource that has an s3_key.
 * Never expose s3_key directly to the client.
 *
 * `expiresIn` (seconds) overrides the default hour — podcast audio is signed
 * for longer, because the browser range-requests the MP3 throughout playback
 * and a 52-minute episode started late would 403 mid-listen.
 */
export async function getPresignedUrl(s3Key: string, expiresIn = EXPIRY): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Same, but forces a save-to-disk instead of rendering in the browser.
 *
 * The objects in the bucket carry `Content-Type: application/pdf` and no
 * Content-Disposition, so a plain presigned URL opens the PDF inline — and an
 * `<a download>` cannot change that, because the download attribute is ignored
 * on cross-origin URLs. Overriding the response header at sign time is the only
 * way to make a download button actually download.
 */
export async function getPresignedDownloadUrl(
  s3Key: string,
  filename: string,
): Promise<string> {
  // Quotes delimit the filename in the header, so a quote inside it would break
  // the value; strip anything awkward rather than escaping.
  const safe = filename.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 120);
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    ResponseContentDisposition: `attachment; filename="${safe}"`,
  });
  return getSignedUrl(s3, command, { expiresIn: EXPIRY });
}

// -----------------------------------------------------------------------------
// Admin content uploads (11-19-26) — /admin/content lets an admin publish a
// newsletter or podcast episode without a loader script. Files go browser → S3
// on a presigned PUT, because a Vercel function body tops out at ~4.5 MB and an
// episode MP3 is ten times that. The bucket's CORS rule (scripts/set-s3-cors.js)
// is what allows the browser to make that PUT.
// -----------------------------------------------------------------------------

/** Presigned PUT for one object. The browser must send the same Content-Type. */
export async function getPresignedUploadUrl(
  s3Key: string, contentType: string, expiresIn = 900,
): Promise<string> {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: s3Key, ContentType: contentType });
  // The presigner leaves Content-Type unsigned unless told otherwise, which
  // would let the upload be stored as any type. Signing it makes S3 refuse
  // (403) a PUT whose header differs.
  return getSignedUrl(s3, command, { expiresIn, signableHeaders: new Set(['content-type']) });
}

/** Size + type of an object, or null when it is not there. */
export async function headObject(
  s3Key: string,
): Promise<{ size: number; contentType: string | null } | null> {
  try {
    const out = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: s3Key }));
    return { size: out.ContentLength ?? 0, contentType: out.ContentType ?? null };
  } catch (e: any) {
    if (e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404) return null;
    throw e;
  }
}

/** Whole object in memory — small things only (a newsletter PDF, a headshot). */
export async function getObjectBytes(
  s3Key: string,
): Promise<{ bytes: Uint8Array; contentType: string | null } | null> {
  try {
    const out = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));
    if (!out.Body) return null;
    return { bytes: await out.Body.transformToByteArray(), contentType: out.ContentType ?? null };
  } catch (e: any) {
    if (e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404) return null;
    throw e;
  }
}
