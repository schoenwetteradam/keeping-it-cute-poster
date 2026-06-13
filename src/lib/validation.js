const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime'])

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

export function validateUpload(file) {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) {
    return 'No file provided'
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'File is too large. The maximum size is 25 MB.'
  }
  if (!IMAGE_TYPES.has(file.type) && !VIDEO_TYPES.has(file.type)) {
    return 'Unsupported file type. Use JPG, PNG, WebP, MP4, or MOV.'
  }
  return null
}

export function cleanText(value, maxLength = 5000) {
  return String(value || '').trim().slice(0, maxLength)
}

export function isPublicHttpUrl(value) {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return false
    return !['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  } catch {
    return false
  }
}
