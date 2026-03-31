import DOMPurify from 'dompurify'

/** Keep in sync with backend `sanitize-post-html.ts` allowlist. */
const RICH_POST_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'del',
  'code',
  'pre',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'hr',
  'a',
  'img',
  'span',
  'div',
] as const

const RICH_POST_ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'style',
  'class',
  'data-type',
  'data-latex',
] as const

/**
 * Client-side sanitization before `dangerouslySetInnerHTML` (server also sanitizes on save).
 */
export function sanitizeRichHtmlForRender(html: string): string {
  if (typeof window === 'undefined') return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...RICH_POST_ALLOWED_TAGS],
    ALLOWED_ATTR: [...RICH_POST_ALLOWED_ATTR],
    ALLOW_DATA_ATTR: false,
    ADD_URI_SAFE_ATTR: ['href', 'src'],
  })
}

/** Plain-text preview for feed cards (runs in client components). */
export function stripHtmlToText(html: string): string {
  if (typeof window === 'undefined') {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
  const el = document.createElement('div')
  el.innerHTML = html
  const text = el.textContent ?? el.innerText ?? ''
  return text.replace(/\s+/g, ' ').trim()
}
