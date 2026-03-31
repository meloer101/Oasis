import { Hono } from 'hono'
import { authenticate } from '../middleware/auth.js'

export const uploadRoutes = new Hono()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'post-images'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

uploadRoutes.post('/image', authenticate, async (c) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return c.json({ error: 'Image upload is not configured on this server.' }, 503)
  }

  const body = await c.req.parseBody()
  const file = body['file']

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file provided. Send a multipart/form-data request with a "file" field.' }, 400)
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return c.json({ error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` }, 400)
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: 'File too large. Maximum size is 5MB.' }, 400)
  }

  const userId = c.get('userId')
  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': file.type,
      'x-upsert': 'false',
    },
    body: await file.arrayBuffer(),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('Supabase Storage upload failed:', res.status, errText)
    return c.json({ error: 'Upload failed. Please try again.' }, 500)
  }

  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`
  return c.json({ url })
})
