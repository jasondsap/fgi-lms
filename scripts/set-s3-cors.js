// Sets the CORS rule on the resources bucket so /admin/content can upload
// straight from the browser (presigned PUT — see lib/s3.ts). Without it the
// browser blocks the PUT before it leaves; nothing else about the bucket
// changes, and it stays private: CORS only says which sites' pages may make a
// request, the request still needs a signature only an admin can obtain.
//
// Run: node scripts/set-s3-cors.js [--dry]     (--dry prints the current rule)
// Add a new production hostname here before pointing a new domain at the app.
require('dotenv').config({ path: '.env.local' });
const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const Bucket = process.env.S3_BUCKET_NAME;

const CORSRules = [{
  AllowedOrigins: [
    'https://fgilearn.org',
    'https://www.fgilearn.org',
    'http://localhost:3000',
  ],
  AllowedMethods: ['PUT'],
  AllowedHeaders: ['*'],
  ExposeHeaders: ['ETag'],
  MaxAgeSeconds: 3000,
}];

(async () => {
  try {
    const now = await s3.send(new GetBucketCorsCommand({ Bucket }));
    console.log('current:', JSON.stringify(now.CORSRules, null, 2));
  } catch (e) {
    console.log('current: none (' + e.name + ')');
  }
  if (process.argv.includes('--dry')) return;
  await s3.send(new PutBucketCorsCommand({ Bucket, CORSConfiguration: { CORSRules } }));
  console.log('set:', JSON.stringify(CORSRules, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
