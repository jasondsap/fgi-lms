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
 */
export async function getPresignedUrl(s3Key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return getSignedUrl(s3, command, { expiresIn: EXPIRY });
}
