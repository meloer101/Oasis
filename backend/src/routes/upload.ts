import { Hono } from 'hono'
import { authenticate } from '../middleware/auth.js'

/**
 * Reserved media upload API. Wire multipart + object storage (e.g. Supabase) here later.
 */
export const uploadRoutes = new Hono()

uploadRoutes.post('/image', authenticate, async (c) => {
  return c.json(
    {
      error: 'Not implemented',
      message:
        'Image upload is not configured yet. Paste an HTTPS image URL in the editor, or implement storage and return { url } from this endpoint.',
    },
    501,
  )
})
