import sanitizeHtml from 'sanitize-html'

/**
 * Server-side HTML allowlist for rich posts (must stay in sync with frontend DOMPurify + KaTeX hydration).
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
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
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'class'],
    img: ['src', 'alt', 'title', 'width', 'height', 'class'],
    span: ['style', 'class', 'data-type', 'data-latex'],
    div: ['style', 'class', 'data-type', 'data-latex'],
    p: ['style', 'class'],
    h1: ['style', 'class'],
    h2: ['style', 'class'],
    h3: ['style', 'class'],
    h4: ['style', 'class'],
    h5: ['style', 'class'],
    h6: ['style', 'class'],
    li: ['class'],
    ul: ['class'],
    ol: ['class'],
    blockquote: ['class'],
    code: ['class'],
    pre: ['class'],
  },
  allowedStyles: {
    p: {
      color: [
        /^#[0-9a-fA-F]{3,8}$/,
        /^rgb\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/,
        /^rgba\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*[\d.]+\s*\)$/,
      ],
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
    span: {
      color: [
        /^#[0-9a-fA-F]{3,8}$/,
        /^rgb\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/,
        /^rgba\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*[\d.]+\s*\)$/,
      ],
    },
    div: {
      color: [
        /^#[0-9a-fA-F]{3,8}$/,
        /^rgb\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/,
        /^rgba\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*[\d.]+\s*\)$/,
      ],
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
    h1: {
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
    h2: {
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
    h3: {
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
    h4: {
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
    h5: {
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
    h6: {
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https'],
  },
  // Block data: URLs except very small placeholders if needed later
  allowProtocolRelative: false,
}

export function sanitizePostRichHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS)
}
