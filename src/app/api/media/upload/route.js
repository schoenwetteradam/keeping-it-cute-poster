import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import db from '@/lib/db'
import { uploadToR2 } from '@/lib/storage'
import { validateUpload } from '@/lib/validation'

const ALLOWED_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const uploadedBy = formData.get('uploadedBy') || ''

    const validationError = validateUpload(file)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const id = uuidv4()
    const filename = `media/${id}${ALLOWED_EXTENSIONS[file.type]}`
    const bytes = Buffer.from(await file.arrayBuffer())
    const url = await uploadToR2(filename, bytes, file.type)

    const media = await db.media.insert({
      id, filename, original_name: file.name, mime_type: file.type, size: file.size, uploaded_by: uploadedBy,
    })

    return NextResponse.json({
      id: media.id,
      filename: media.filename,
      originalName: media.original_name,
      mimeType: media.mime_type,
      size: media.size,
      uploadedBy: media.uploaded_by,
      createdAt: media.created_at,
      url,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
