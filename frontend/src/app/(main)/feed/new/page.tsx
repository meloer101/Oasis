'use client'

import { useState, useRef, KeyboardEvent, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'
import { useLocale } from '@/hooks/use-locale'
import { RichEditor } from '@/components/editor/rich-editor'

function hasMeaningfulRichText(html: string): boolean {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 0
}

export default function NewPostPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { refreshBalance } = useAuth()
  const { t } = useLocale()
  const [serverError, setServerError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const tagRef = useRef<HTMLInputElement>(null)

  const schema = useMemo(
    () =>
      z
        .object({
          title: z.string().min(1, t('feedNew.titleRequired')).max(300),
          content: z.string(),
          contentType: z.enum(['rich', 'link']),
          linkUrl: z.string().url().optional().or(z.literal('')),
        })
        .superRefine((data, ctx) => {
          if (data.contentType === 'rich') {
            if (!hasMeaningfulRichText(data.content)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: t('feedNew.contentRequired'),
                path: ['content'],
              })
            }
          } else if (!data.content.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('feedNew.contentRequired'),
              path: ['content'],
            })
          }
        }),
    [t],
  )

  type FormData = z.infer<typeof schema>

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { contentType: 'rich', content: '' },
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
      setServerError(msg ?? t('feedNew.publishError'))
    },
  })

  async function onSubmit(data: FormData) {
    setServerError('')
    mutation.mutate(data)
  }

  const inputClass =
    'w-full bg-surface border border-border-subtle rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-700 transition-colors text-sm'

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-text-primary">{t('feedNew.title')}</h1>
        <button
          onClick={() => router.back()}
          className="text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          {t('feedNew.cancel')}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex gap-3">
          {(['rich', 'link'] as const).map((type) => (
            <label key={type} className="flex items-center gap-1.5 cursor-pointer">
              <input
                {...register('contentType')}
                type="radio"
                value={type}
                className="accent-emerald-500"
              />
              <span className="text-sm text-text-secondary capitalize">
                {type === 'rich' ? `📝 ${t('feedNew.richText')}` : `🔗 ${t('feedNew.link')}`}
              </span>
            </label>
          ))}
        </div>

        <div>
          <input {...register('title')} placeholder={t('feedNew.titlePlaceholder')} className={inputClass} />
          {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
        </div>

        <div>
          {contentType === 'rich' ? (
            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <RichEditor
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('feedNew.bodyPlaceholder')}
                />
              )}
            />
          ) : (
            <textarea
              {...register('content')}
              placeholder={t('feedNew.linkDescPlaceholder')}
              rows={6}
              className={inputClass + ' resize-none'}
            />
          )}
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

        <div>
          <div
            className="flex flex-wrap gap-1.5 min-h-[44px] bg-surface border border-border-subtle rounded-lg px-3 py-2 focus-within:border-emerald-700 transition-colors cursor-text"
            onClick={() => tagRef.current?.focus()}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-zinc-300 dark:bg-zinc-700 text-text-secondary"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((x) => x !== tag))}
                  className="text-text-muted hover:text-text-primary ml-0.5"
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
                placeholder={tags.length === 0 ? t('feedNew.tagsPlaceholder') : ''}
                className="flex-1 min-w-[120px] bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
              />
            )}
          </div>
          <p className="text-xs text-text-muted mt-1">{t('feedNew.tagsHint')}</p>
        </div>

        {serverError && <p className="text-sm text-red-400">{serverError}</p>}

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-text-muted">{t('feedNew.rewardHint')}</p>
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {mutation.isPending ? t('feedNew.publishing') : t('feedNew.publish')}
          </button>
        </div>
      </form>
    </div>
  )
}
