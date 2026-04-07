'use client'

import { Suspense, useEffect, useMemo, useRef, useState, KeyboardEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'
import { useLocale } from '@/hooks/use-locale'
import { RichEditor } from '@/components/editor/rich-editor'
import { useCircle, useCircles } from '@/hooks/use-circle'

const CIRCLE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function hasMeaningfulRichText(html: string): boolean {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 0
}

export default function NewPostPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-5xl mx-auto py-20 text-center text-sm text-text-muted">…</div>
      }
    >
      <NewPostPageContent />
    </Suspense>
  )
}

function NewPostPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { refreshBalance, user } = useAuth()
  const { t } = useLocale()
  const [serverError, setServerError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [circleId, setCircleId] = useState<string>('')
  const [visibility, setVisibility] = useState<'public' | 'circle_only'>('public')
  const [category, setCategory] = useState<'idea' | 'tech' | 'else'>('idea')
  const [savedDraft, setSavedDraft] = useState<{
    title: string
    content: string
    contentType: 'rich' | 'link'
    linkUrl?: string
    tags: string[]
    circleId: string
    visibility?: 'public' | 'circle_only'
    category: 'idea' | 'tech' | 'else'
    savedAt: number
  } | null>(null)
  const tagRef = useRef<HTMLInputElement>(null)
  const { data: circles } = useCircles()

  const lockedCircleId = useMemo(() => {
    const raw = searchParams.get('circle')?.trim()
    if (!raw || !CIRCLE_UUID_RE.test(raw)) return null
    return raw
  }, [searchParams])

  const {
    data: lockedCircle,
    isError: lockedCircleError,
    isLoading: lockedCircleLoading,
  } = useCircle(lockedCircleId ?? '', { enabled: Boolean(lockedCircleId) })

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
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { contentType: 'rich', content: '' },
  })

  const contentType = watch('contentType')
  const titleValue = watch('title') ?? ''
  const contentValue = watch('content') ?? ''
  const linkUrlValue = watch('linkUrl') ?? ''

  const draftKey = useMemo(
    () =>
      `oasis_post_draft_v2:${user?.id ?? 'anon'}:${lockedCircleId ?? 'global'}`,
    [user?.id, lockedCircleId],
  )

  const isMeaningfullyEmpty = useMemo(() => {
    const titleEmpty = !titleValue.trim()
    const bodyEmpty =
      contentType === 'rich' ? !hasMeaningfulRichText(contentValue) : !contentValue.trim()
    const linkEmpty = contentType === 'link' ? !String(linkUrlValue ?? '').trim() : true
    const tagsEmpty = tags.length === 0
    const circleEmpty = !circleId
    return titleEmpty && bodyEmpty && linkEmpty && tagsEmpty && circleEmpty
  }, [circleId, contentType, contentValue, linkUrlValue, tags.length, titleValue])

  useEffect(() => {
    if (!circleId) setVisibility('public')
  }, [circleId])

  useEffect(() => {
    if (lockedCircleId) setCircleId(lockedCircleId)
    else setCircleId('')
  }, [lockedCircleId])

  const CATEGORIES = [
    { value: 'idea', label: '💡 Idea' },
    { value: 'tech', label: '🔬 Tech' },
    { value: 'else', label: '✦ Other' },
  ] as const

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        title?: string
        content?: string
        contentType?: 'rich' | 'link'
        linkUrl?: string
        tags?: string[]
        circleId?: string
        visibility?: 'public' | 'circle_only'
        category?: 'idea' | 'tech' | 'else'
        savedAt?: number
      }
      if (!parsed || typeof parsed !== 'object') return
      const next = {
        title: String(parsed.title ?? ''),
        content: String(parsed.content ?? ''),
        contentType: (parsed.contentType ?? 'rich') as 'rich' | 'link',
        linkUrl: parsed.linkUrl ? String(parsed.linkUrl) : '',
        tags: Array.isArray(parsed.tags) ? parsed.tags.map((x) => String(x)) : [],
        circleId: String(parsed.circleId ?? ''),
        visibility:
          parsed.visibility === 'circle_only' || parsed.visibility === 'public'
            ? parsed.visibility
            : 'public',
        category: (['idea', 'tech', 'else'] as const).includes(parsed.category as 'idea' | 'tech' | 'else')
          ? (parsed.category as 'idea' | 'tech' | 'else')
          : 'idea',
        savedAt: Number(parsed.savedAt ?? Date.now()),
      }
      setSavedDraft(next)
    } catch {
      // ignore invalid drafts
    }
  }, [draftKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const timer = window.setTimeout(() => {
      try {
        if (isMeaningfullyEmpty) {
          localStorage.removeItem(draftKey)
          return
        }
        const payload = {
          title: titleValue ?? '',
          content: contentValue ?? '',
          contentType,
          linkUrl: linkUrlValue ?? '',
          tags,
          circleId,
          visibility,
          category,
          savedAt: Date.now(),
        }
        localStorage.setItem(draftKey, JSON.stringify(payload))
        setSavedDraft(payload)
      } catch {
        // ignore storage failures
      }
    }, 500)
    return () => window.clearTimeout(timer)
  }, [circleId, contentType, contentValue, draftKey, isMeaningfullyEmpty, linkUrlValue, tags, titleValue, visibility])

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
      if (circleId) {
        body.circleId = circleId
        body.visibility = visibility
      }
      body.category = category
      return apiClient.post('/api/posts', body)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      refreshBalance()
      if (typeof window !== 'undefined') localStorage.removeItem(draftKey)
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
    'w-full bg-surface border border-border-subtle rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand transition-colors text-sm'

  return (
    <div className="w-full max-w-5xl mx-auto">
      {savedDraft && isMeaningfullyEmpty && (
        <div className="mb-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 text-sm text-text-secondary flex flex-wrap items-center justify-between gap-3">
          <span>{t('feedNew.draftFound')}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                reset({
                  title: savedDraft.title,
                  content: savedDraft.content,
                  contentType: savedDraft.contentType,
                  linkUrl: savedDraft.linkUrl ?? '',
                })
                setTags(savedDraft.tags ?? [])
                setCircleId(savedDraft.circleId ?? '')
                setVisibility(savedDraft.visibility ?? 'public')
                setCategory(savedDraft.category ?? 'idea')
              }}
              className="text-sm font-semibold text-text-primary hover:underline"
            >
              {t('feedNew.draftRestore')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t('feedNew.draftDiscardConfirm'))) {
                  localStorage.removeItem(draftKey)
                  setSavedDraft(null)
                }
              }}
              className="text-sm text-text-muted hover:text-text-secondary"
            >
              {t('feedNew.draftDiscard')}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-text-primary">{t('feedNew.title')}</h1>
        <button
          onClick={() => router.back()}
          className="text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          {t('feedNew.cancel')}
        </button>
      </div>

      <div className="flex gap-6">
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-w-0 space-y-4">
        <div>
          <p className="text-xs text-text-muted mb-1.5">{t('feedNew.categoryLabel')}</p>
          <div className="flex gap-2">
            {CATEGORIES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-lg border transition-[color,background-color,border-color] duration-150 ${
                  category === value
                    ? 'bg-[var(--card-bg)] text-text-primary border-[color-mix(in_srgb,var(--text-primary)_22%,var(--card-border))] shadow-sm'
                    : 'text-text-secondary border-border-subtle hover:text-text-primary hover:border-[color-mix(in_srgb,var(--text-primary)_14%,var(--card-border))]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          {(['rich', 'link'] as const).map((type) => (
            <label key={type} className="flex items-center gap-1.5 cursor-pointer">
              <input
                {...register('contentType')}
                type="radio"
                value={type}
                className="accent-brand"
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

        {lockedCircleId ? (
          <div className="rounded-xl border border-border-subtle bg-surface px-4 py-3 space-y-2">
            <p className="text-xs text-text-muted">{t('feedNew.postingInCircle')}</p>
            {lockedCircleError ? (
              <p className="text-sm text-red-400">{t('feedNew.invalidCircleLink')}</p>
            ) : (
              <p className="text-sm font-semibold text-text-primary">
                {lockedCircleLoading ? '…' : (lockedCircle?.name ?? lockedCircleId)}
              </p>
            )}
            <Link
              href="/feed/new"
              className="text-xs text-text-muted hover:text-text-secondary underline underline-offset-2"
            >
              {t('feedNew.postGloballyInstead')}
            </Link>
          </div>
        ) : circles && circles.length > 0 ? (
          <div>
            <label className="text-sm text-text-secondary block mb-1.5">{t('feedNew.circle')}</label>
            <select
              value={circleId}
              onChange={(e) => setCircleId(e.target.value)}
              className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand transition-colors"
            >
              <option value="">{t('feedNew.circleNone')}</option>
              {circles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {circleId ? (
          <div>
            <p className="text-xs text-text-muted mb-1.5">{t('feedNew.visibility')}</p>
            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="post-visibility"
                  checked={visibility === 'public'}
                  onChange={() => setVisibility('public')}
                  className="accent-brand mt-0.5 shrink-0"
                />
                <span className="text-sm text-text-secondary leading-snug">{t('feedNew.visibilityPublic')}</span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="post-visibility"
                  checked={visibility === 'circle_only'}
                  onChange={() => setVisibility('circle_only')}
                  className="accent-brand mt-0.5 shrink-0"
                />
                <span className="text-sm text-text-secondary leading-snug">{t('feedNew.visibilityCircleOnly')}</span>
              </label>
            </div>
          </div>
        ) : null}

        <div>
          <div
            className="flex flex-wrap gap-1.5 min-h-[44px] bg-surface border border-border-subtle rounded-lg px-3 py-2 focus-within:border-brand transition-colors cursor-text"
            onClick={() => tagRef.current?.focus()}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-brand-muted dark:bg-input text-text-secondary"
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
            disabled={
              isSubmitting ||
              mutation.isPending ||
              (Boolean(lockedCircleId) && lockedCircleError)
            }
            className="px-5 py-2.5 bg-brand hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-brand-foreground text-sm font-medium rounded-lg transition-opacity"
          >
            {mutation.isPending ? t('feedNew.publishing') : t('feedNew.publish')}
          </button>
        </div>
      </form>

      {/* Writing tips sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-20 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 space-y-4 text-sm">
          <div>
            <p className="font-semibold text-text-primary mb-2">{t('feedNew.tipsTitle')}</p>
            <ul className="space-y-2 text-text-muted text-xs leading-relaxed list-disc pl-4">
              <li>{t('feedNew.tip1')}</li>
              <li>{t('feedNew.tip2')}</li>
              <li>{t('feedNew.tip3')}</li>
            </ul>
          </div>
          <div className="border-t border-[var(--card-border)] pt-4">
            <p className="font-semibold text-text-primary mb-2">{t('feedNew.tipsTagsTitle')}</p>
            <ul className="space-y-2 text-text-muted text-xs leading-relaxed list-disc pl-4">
              <li>{t('feedNew.tipTag1')}</li>
              <li>{t('feedNew.tipTag2')}</li>
            </ul>
          </div>
          <div className="border-t border-[var(--card-border)] pt-4">
            <p className="text-xs text-text-muted leading-relaxed">{t('feedNew.rewardHint')}</p>
          </div>
        </div>
      </aside>
      </div>
    </div>
  )
}
