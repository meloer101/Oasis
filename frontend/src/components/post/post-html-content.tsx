'use client'

import { useLayoutEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { sanitizeRichHtmlForRender } from '@/lib/html'

export function PostHtmlContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)

  const safe = sanitizeRichHtmlForRender(html)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return

    root.querySelectorAll<HTMLElement>('[data-type="block-math"][data-latex]').forEach((el) => {
      const latex = el.getAttribute('data-latex') ?? ''
      el.replaceChildren()
      try {
        katex.render(latex, el, { displayMode: true, throwOnError: false })
      } catch {
        el.textContent = latex
      }
    })

    root.querySelectorAll<HTMLElement>('[data-type="inline-math"][data-latex]').forEach((el) => {
      const latex = el.getAttribute('data-latex') ?? ''
      el.replaceChildren()
      try {
        katex.render(latex, el, { displayMode: false, throwOnError: false })
      } catch {
        el.textContent = latex
      }
    })
  }, [safe])

  return (
    <div
      ref={ref}
      className="prose-post text-text-secondary text-sm leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-border-subtle [&_blockquote]:pl-3 [&_blockquote]:italic [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-zinc-100 [&_pre]:p-3 [&_pre]:text-xs dark:[&_pre]:bg-zinc-900 [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:text-xs dark:[&_code]:bg-zinc-900 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-text-primary [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-text-primary [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-text-primary [&_img]:max-w-full [&_a]:text-emerald-600 dark:[&_a]:text-emerald-400"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
