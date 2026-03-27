'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'

const schema = z.object({
  title: z.string().min(1, '标题不能为空').max(300),
  content: z.string().min(1, '内容不能为空'),
  contentType: z.enum(['markdown', 'link', 'image']),
  linkUrl: z.string().url().optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

export default function NewPostPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { refreshBalance } = useAuth()
  const [serverError, setServerError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const tagRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { contentType: 'markdown' },
  })

  const contentType = watch('contentType')

  function addTag(raw: string) {
    const name = raw.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-')
    if (!name || tags.includes(name) || tags.length >= 5) return
    setTags((prev) => [...prev, name])
    setTagInput('')
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const body: Record<string, unknown> = {
        title: data.title,
        content: data.content,
        contentType: data.contentType,
        tags,
      }
      if (data.contentType === 'link' && data.linkUrl) {
        body.linkUrl = data.linkUrl
      }
      return apiClient.post('/api/posts', body)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      refreshBalance()
      router.replace(`/post/${res.data.id}`)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setServerError(msg ?? '发布失败，请重试')
    },
  })

  async function onSubmit(data: FormData) {
    setServerError('')
    mutation.mutate(data)
  }

  const inputClass =
    'w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-700 transition-colors text-sm'

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">发布帖子</h1>
        <button
          onClick={() => router.back()}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          取消
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Content type selector */}
        <div className="flex gap-3">
          {(['markdown', 'link'] as const).map((type) => (
            <label key={type} className="flex items-center gap-1.5 cursor-pointer">
              <input
                {...register('contentType')}
                type="radio"
                value={type}
                className="accent-emerald-500"
              />
              <span className="text-sm text-zinc-400 capitalize">
                {type === 'markdown' ? '📝 正文' : '🔗 链接'}
              </span>
            </label>
          ))}
        </div>

        <div>
          <input {...register('title')} placeholder="标题" className={inputClass} />
          {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
        </div>

        <div>
          <textarea
            {...register('content')}
            placeholder={contentType === 'link' ? '描述这个链接…' : '写点什么…（支持 Markdown）'}
            rows={6}
            className={inputClass + ' resize-none'}
          />
          {errors.content && <p className="mt-1 text-xs text-red-400">{errors.content.message}</p>}
        </div>

        {contentType === 'link' && (
          <div>
            <input
              {...register('linkUrl')}
              type="url"
              placeholder="https://…"
              className={inputClass}
            />
            {errors.linkUrl && <p className="mt-1 text-xs text-red-400">{errors.linkUrl.message}</p>}
          </div>
        )}

        {/* Tags input */}
        <div>
          <div
            className="flex flex-wrap gap-1.5 min-h-[44px] bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 focus-within:border-emerald-700 transition-colors cursor-text"
            onClick={() => tagRef.current?.focus()}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  className="text-zinc-500 hover:text-zinc-200 ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
            {tags.length < 5 && (
              <input
                ref={tagRef}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => addTag(tagInput)}
                placeholder={tags.length === 0 ? '添加标签（回车确认，最多 5 个）' : ''}
                className="flex-1 min-w-[120px] bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
              />
            )}
          </div>
          <p className="text-xs text-zinc-600 mt-1">回车或逗号添加标签</p>
        </div>

        {serverError && <p className="text-sm text-red-400">{serverError}</p>}

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-zinc-600">发帖获得 +5 枚认同币奖励</p>
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {mutation.isPending ? '发布中…' : '发布'}
          </button>
        </div>
      </form>
    </div>
  )
}
