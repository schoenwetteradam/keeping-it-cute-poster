import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucket = process.env.R2_BUCKET
const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '')

let client = null

function r2() {
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET must be configured.')
  }
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  }
  return client
}

export function publicUrlFor(key) {
  if (!publicUrl) throw new Error('R2_PUBLIC_URL is not configured.')
  return `${publicUrl}/${key}`
}

export async function uploadToR2(key, bytes, contentType) {
  await r2().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: contentType }))
  return publicUrlFor(key)
}

export async function deleteFromR2(key) {
  await r2().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

// Recovers the R2 object key from a URL previously returned by uploadToR2,
// e.g. so a stored media_url can be looked up back in the media table.
export function keyFromUrl(url) {
  if (!url || !publicUrl || !url.startsWith(`${publicUrl}/`)) return null
  return url.slice(publicUrl.length + 1)
}
