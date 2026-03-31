'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Mathematics from '@tiptap/extension-mathematics'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { useTheme } from 'next-themes'

import { apiClient } from '@/lib/api-client'
import './rich-editor.css'

export type RichEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

// SVG icon components
function BoldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
  )
}

function ItalicIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  )
}

function UnderlineIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  )
}

function HeadingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16" />
      <path d="M4 5v14" />
      <path d="M20 5v14" />
    </svg>
  )
}

function AlignCenterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="10" x2="6" y2="10" />
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="18" y1="18" x2="6" y2="18" />
    </svg>
  )
}

function AlignLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="17" y1="10" x2="3" y2="10" />
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="17" y1="18" x2="3" y2="18" />
    </svg>
  )
}

function AlignRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="21" y1="10" x2="7" y2="10" />
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="21" y1="18" x2="7" y2="18" />
    </svg>
  )
}

function PaletteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function SmileIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
      <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
    </svg>
  )
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={
        'flex h-7 w-7 items-center justify-center rounded transition-colors disabled:opacity-40 ' +
        (active
          ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
          : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800')
      }
    >
      {children}
    </button>
  )
}

export function RichEditor({ value, onChange, placeholder = '', className = '' }: RichEditorProps) {
  const { resolvedTheme } = useTheme()
  const [emojiOpen, setEmojiOpen] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            class: 'text-emerald-600 underline dark:text-emerald-400',
            rel: 'noopener noreferrer',
            target: '_blank',
          },
        },
      }),
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Mathematics.configure({
        katexOptions: { throwOnError: false },
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
  })

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (editor.isFocused) return
    const current = editor.getHTML()
    if (current === value || (value === '' && (current === '<p></p>' || current === ''))) return
    editor.commands.setContent(value || '', { emitUpdate: false })
  }, [value, editor])

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL', prev ?? 'https://')
    if (url === null) return
    const trimmed = url.trim()
    if (trimmed === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run()
  }, [editor])

  const addImage = useCallback(() => {
    if (!editor) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await apiClient.post<{ url?: string }>('/api/upload/image', fd)
        const url = res.data?.url
        if (url) editor.chain().focus().setImage({ src: url }).run()
      } catch {
        const url = window.prompt('上传未就绪，请粘贴图片 HTTPS 地址：')
        if (url?.trim()) editor.chain().focus().setImage({ src: url.trim() }).run()
      }
    }
    input.click()
  }, [editor])

  const insertBlockMath = useCallback(() => {
    if (!editor) return
    const latex = window.prompt('块级公式 LaTeX（例如 \\sum_{i=1}^n i）', '')
    if (latex === null || !latex.trim()) return
    editor.chain().focus().insertBlockMath({ latex: latex.trim() }).run()
  }, [editor])

  const insertInlineMath = useCallback(() => {
    if (!editor) return
    const latex = window.prompt('行内公式 LaTeX', 'x^2')
    if (latex === null || !latex.trim()) return
    editor.chain().focus().insertInlineMath({ latex: latex.trim() }).run()
  }, [editor])

  // current color for swatch preview
  const currentColor = editor?.getAttributes('textStyle').color as string | undefined

  if (!editor) {
    return (
      <div className={`rich-editor-root rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 ${className}`}>
        <div className="h-[200px] animate-pulse bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
      </div>
    )
  }

  return (
    <div className={`rich-editor-root rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-zinc-200 dark:border-zinc-800 px-3 py-1.5">

        {/* Text style: Bold, Italic, Underline */}
        <ToolbarButton
          title="加粗"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon />
        </ToolbarButton>
        <ToolbarButton
          title="斜体"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon />
        </ToolbarButton>
        <ToolbarButton
          title="下划线"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon />
        </ToolbarButton>

        <span className="mx-1.5 h-4 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden />

        {/* Heading select */}
        <div className="flex items-center gap-1">
          <HeadingIcon />
          <select
            className="h-7 rounded bg-transparent py-0 pl-0.5 pr-5 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
            value={
              editor.isActive('heading', { level: 1 })
                ? 'h1'
                : editor.isActive('heading', { level: 2 })
                  ? 'h2'
                  : editor.isActive('heading', { level: 3 })
                    ? 'h3'
                    : 'p'
            }
            onChange={(e) => {
              const v = e.target.value
              const ch = editor.chain().focus()
              if (v === 'p') ch.setParagraph().run()
              else if (v === 'h1') ch.setHeading({ level: 1 }).run()
              else if (v === 'h2') ch.setHeading({ level: 2 }).run()
              else if (v === 'h3') ch.setHeading({ level: 3 }).run()
            }}
            title="标题"
          >
            <option value="p">正文</option>
            <option value="h1">标题 1</option>
            <option value="h2">标题 2</option>
            <option value="h3">标题 3</option>
          </select>
        </div>

        <span className="mx-1.5 h-4 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden />

        {/* Text alignment */}
        <ToolbarButton
          title="居中"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenterIcon />
        </ToolbarButton>
        <ToolbarButton
          title="左对齐"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeftIcon />
        </ToolbarButton>
        <ToolbarButton
          title="右对齐"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRightIcon />
        </ToolbarButton>

        <span className="mx-1.5 h-4 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden />

        {/* Color picker: palette icon + color swatch */}
        <label
          className="flex h-7 cursor-pointer items-center gap-1 rounded px-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          title="文字颜色"
        >
          <PaletteIcon />
          <span
            className="h-4 w-4 rounded-sm border border-zinc-300 dark:border-zinc-600"
            style={{ backgroundColor: currentColor ?? '#000000' }}
          />
          <input
            type="color"
            className="sr-only"
            defaultValue="#000000"
            onInput={(e) => editor.chain().focus().setColor(e.currentTarget.value).run()}
          />
        </label>

        <span className="mx-1.5 h-4 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden />

        {/* Link, Image, Emoji */}
        <ToolbarButton title="链接" active={editor.isActive('link')} onClick={setLink}>
          <LinkIcon />
        </ToolbarButton>
        <ToolbarButton title="图片" onClick={addImage}>
          <ImageIcon />
        </ToolbarButton>

        <div className="relative">
          <ToolbarButton title="表情" onClick={() => setEmojiOpen((o) => !o)}>
            <SmileIcon />
          </ToolbarButton>
          {emojiOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="关闭表情"
                onClick={() => setEmojiOpen(false)}
              />
              <div className="absolute left-0 top-full z-50 mt-1 shadow-lg">
                <Picker
                  data={data}
                  theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                  onEmojiSelect={(emoji: { native: string }) => {
                    editor.chain().focus().insertContent(emoji.native).run()
                    setEmojiOpen(false)
                  }}
                />
              </div>
            </>
          )}
        </div>

        <span className="mx-1.5 h-4 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden />

        {/* Math */}
        <ToolbarButton title="行内公式" onClick={insertInlineMath}>
          <span className="text-sm font-medium">Σ</span>
        </ToolbarButton>
        <ToolbarButton title="块公式" onClick={insertBlockMath}>
          <span className="text-sm font-medium">√</span>
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
