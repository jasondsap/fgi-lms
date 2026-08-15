// =============================================================================
// S3 client — presigned URL generation for secure PDF downloads
// =============================================================================
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
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
