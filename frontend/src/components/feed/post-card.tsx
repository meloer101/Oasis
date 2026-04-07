'use client'

import Link from 'next/link'
import { useEffect, useState, type MouseEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Post } from '@/lib/types'
import { timeAgo, heatBadge, estimateReadingMinutes, sentimentActivityParts, formatCoins } from '@/lib/utils'
import VoteButton from './vote-button'
import { TemperatureBar } from './temperature-bar'
import { stripHtmlToText } from '@/lib/html'
import { useLocale } from '@/hooks/use-locale'
import { Avatar } from '@/components/ui/avatar'
import { shareUrl } from '@/lib/share'
import { useAuth } from '@/providers/auth-provider'
import { apiClient } from '@/lib/api-client'
import { removePostFromCachedQueryData } from '@/lib/post-query-cache'

type OwnerDeleteApi = {
  isOwner: boolean
  isPending: boolean
  requestDelete: () => void
}

function usePostOwnerDelete(post: Post, feedQueryKey: string[]): OwnerDeleteApi {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t } = useLocale()
  const isOwner = !!user && user.id === post.author.id

  const mutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/posts/${post.id}`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: feedQueryKey })
      const previousFeed = queryClient.getQueryData(feedQueryKey)
      queryClient.setQueryData(feedQueryKey, (old) => removePostFromCachedQueryData(old, post.id))

      const userKey = ['user', post.author.username] as const
      await queryClient.cancelQueries({ queryKey: userKey })
      const previousUser = queryClient.getQueryData(userKey)
      queryClient.setQueryData(userKey, (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        const o = old as { postCount?: number }
        if (typeof o.postCount !== 'number') return old
        return { ...o, postCount: Math.max(0, o.postCount - 1) }
      })

      let previousCircle: unknown
      if (post.circleId) {
        const circleKey = ['circle', post.circleId] as const
        await queryClient.cancelQueries({ queryKey: circleKey })
        previousCircle = queryClient.getQueryData(circleKey)
        queryClient.setQueryData(circleKey, (old: unknown) => {
          if (!old || typeof old !== 'object') return old
          const o = old as { postCount?: number }
          if (typeof o.postCount !== 'number') return old
          return { ...o, postCount: Math.max(0, o.postCount - 1) }
        })
      }

      return { previousFeed, previousUser, previousCircle }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousFeed !== undefined) queryClient.setQueryData(feedQueryKey, ctx.previousFeed)
      if (ctx?.previousUser !== undefined) queryClient.setQueryData(['user', post.author.username], ctx.previousUser)
      if (post.circleId && ctx?.previousCircle !== undefined) {
        queryClient.setQueryData(['circle', post.circleId], ctx.previousCircle)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['post-search'] })
      queryClient.invalidateQueries({ queryKey: feedQueryKey })
      queryClient.invalidateQueries({ queryKey: ['user', post.author.username] })
      if (post.circleId) {
        queryClient.invalidateQueries({ queryKey: ['circle', post.circleId] })
        queryClient.invalidateQueries({ queryKey: ['circle-posts', post.circleId] })
      }
    },
  })

  return {
    isOwner,
    isPending: mutation.isPending,
    requestDelete: () => {
      if (!mutation.isPending && window.confirm(t('post.deleteConfirm'))) mutation.mutate()
    },
  }
}

interface Props {
  post: Post
  feedQueryKey: string[]
  /** First post in feed: large cover + spacing */
  featured?: boolean
  /** Profile / list: thumbnail left, content right */
  mediaLeft?: boolean
}

export default function PostCard({ post, feedQueryKey, featured = false, mediaLeft = false }: Props) {
  const { t } = useLocale()
  const ownerDelete = usePostOwnerDelete(post, feedQueryKey)
  const heat = heatBadge(post.temperature)
  const activity = sentimentActivityParts(post.temperature)
  const activityToneKey = activity
    ? activity.tone === 'hot'
      ? 'feed.activityHot'
      : activity.tone === 'active'
        ? 'feed.activityActive'
        : activity.tone === 'warm'
          ? 'feed.activityWarm'
          : activity.tone === 'cool'
            ? 'feed.activityCool'
            : 'feed.activityCold'
    : null
  const activityText =
    activity && activityToneKey
      ? `${activity.signed} ${t(activityToneKey as Parameters<typeof t>[0])}`
      : null

  const previewPlain =
    post.contentType === 'rich' && post.content
      ? stripHtmlToText(post.content)
      : post.content ?? ''
  const preview = previewPlain
    ? previewPlain.slice(0, 160) + (previewPlain.length > 160 ? '…' : '')
    : ''
  const readMin = estimateReadingMinutes(previewPlain)
  const capReached = Math.floor(post.totalVoteAmount * 0.8) >= 200

  const circleName = post.circle?.name

  // ── Featured hero card ────────────────────────────────────────────────────
  if (featured && post.imageUrl) {
    return (
      <article className="group relative transition-all duration-500 ease-[var(--ease-out-expo)] hover:opacity-[0.98] overflow-hidden mb-8">
        <Link href={`/post/${post.id}`} className="relative block min-h-[320px] sm:min-h-[400px] w-full overflow-hidden rounded-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt={post.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] motion-reduce:transition-none group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" aria-hidden />
          <div className="relative z-[1] flex flex-col justify-end min-h-[320px] sm:min-h-[400px] p-6 sm:p-8 text-left">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border border-white/20 text-white/90 bg-white/5 backdrop-blur-md">
                {t('feed.featuredInsight')}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/70">
                {timeAgo(post.createdAt)}
              </span>
            </div>
            <h2 className="font-post-serif text-3xl sm:text-4xl font-medium text-white leading-tight mb-4 tracking-tight">
              {post.title}
            </h2>
            {preview ? (
              <p className="text-base text-white/80 leading-relaxed mb-6 line-clamp-2 max-w-2xl font-normal">{preview}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-4 mt-auto">
              <Avatar
                src={post.author.avatarUrl}
                name={post.author.displayName ?? post.author.username}
                className="w-10 h-10 rounded-full bg-white/10 shrink-0 text-sm ring-1 ring-white/20"
                textClassName="text-white"
              />
              <div className="min-w-0">
                <Link
                  href={`/user/${post.author.username}`}
                  className="font-medium text-white hover:text-white/80 transition-colors text-sm block truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.author.displayName ?? post.author.username}
                </Link>
              </div>
            </div>
          </div>
        </Link>

        <div className="px-2 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center min-w-0">
            <VoteButton
              postId={post.id}
              voterCount={post.voterCount}
              totalVoteAmount={post.totalVoteAmount}
              disagreeVoteAmount={post.disagreeVoteAmount}
              userVoteType={post.userVoteType}
              queryKey={feedQueryKey}
              isAuthorCapReached={capReached}
              variant="compact"
            />
          </div>
          <div className="flex items-center gap-5 shrink-0">
            <Link
              href={`/post/${post.id}`}
              className="text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5"
            >
              <span className="opacity-70">💬</span> {post.commentCount}
            </Link>
            <span className="text-[11px] text-text-muted tabular-nums tracking-tight">{readMin} min</span>
          </div>
        </div>
      </article>
    )
  }

  // ── mediaLeft (thumbnail on left) ────────────────────────────────────────
  if (mediaLeft && post.imageUrl && !featured) {
    return (
      <article className="group relative bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl p-4 transition-all duration-300 hover:shadow-lg hover:border-text-primary/10 flex flex-col sm:flex-row gap-6 mb-4">
        <Link
          href={`/post/${post.id}`}
          className="relative block w-full sm:w-48 shrink-0 aspect-[16/10] sm:aspect-[4/3] bg-[color-mix(in_srgb,var(--text-primary)_3%,var(--bg))] overflow-hidden rounded-xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-[var(--ease-out-expo)] motion-reduce:transition-none group-hover:scale-[1.03]"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <StandardCardBody
            post={post}
            feedQueryKey={feedQueryKey}
            preview={preview}
            readMin={readMin}
            capReached={capReached}
            activityText={activityText}
            circleName={circleName}
            heat={heat}
            ownerDelete={ownerDelete}
          />
        </div>
      </article>
    )
  }

  // ── Standard card ─────────────────────────────────────────────────────────
  return (
    <article className="group relative bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:shadow-lg hover:border-text-primary/10 mb-5">
      {post.imageUrl ? (
        <Link href={`/post/${post.id}`} className="block overflow-hidden bg-[color-mix(in_srgb,var(--text-primary)_2%,var(--bg))] rounded-xl mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt={post.title}
            loading="lazy"
            className="w-full h-56 sm:h-72 object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] motion-reduce:transition-none group-hover:scale-[1.02]"
          />
        </Link>
      ) : null}
      <div className="px-1">
        <StandardCardBody
          post={post}
          feedQueryKey={feedQueryKey}
          preview={preview}
          readMin={readMin}
          capReached={capReached}
          activityText={activityText}
          circleName={circleName}
          heat={heat}
          ownerDelete={ownerDelete}
        />
      </div>
    </article>
  )
}

function StandardCardBody({
  post,
  feedQueryKey,
  preview,
  readMin,
  capReached,
  activityText,
  circleName,
  heat,
  ownerDelete,
}: {
  post: Post
  feedQueryKey: string[]
  preview: string
  readMin: number
  capReached: boolean
  activityText: string | null
  circleName: string | undefined
  heat: ReturnType<typeof heatBadge>
  ownerDelete: OwnerDeleteApi
}) {
  const { t } = useLocale()
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (shareState === 'idle') return
    const timer = window.setTimeout(() => setShareState('idle'), 1500)
    return () => window.clearTimeout(timer)
  }, [shareState])

  async function onShare(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = origin ? `${origin}/post/${post.id}` : `/post/${post.id}`
    const result = await shareUrl({ url, title: post.title })
    if (result === 'failed') setShareState('failed')
    else setShareState('copied')
  }

  return (
    <>
      {/* Author row */}
      <div className="flex items-center justify-between gap-3 mb-4 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            src={post.author.avatarUrl}
            name={post.author.displayName ?? post.author.username}
            className="w-8 h-8 rounded-full bg-[color-mix(in_srgb,var(--text-primary)_5%,var(--bg))] shrink-0 text-[10px] font-medium"
            textClassName="text-text-secondary"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href={`/user/${post.author.username}`}
                className="text-sm font-medium text-text-primary hover:opacity-70 transition-opacity leading-none"
              >
                {post.author.displayName ?? post.author.username}
              </Link>
              {post.category && post.category !== 'else' ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[var(--border-subtle)] text-text-secondary bg-[color-mix(in_srgb,var(--text-primary)_2%,var(--bg))] leading-none tracking-tight">
                  {post.category === 'idea' ? '💡 Idea' : '🔬 Tech'}
                </span>
              ) : null}
              {circleName ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[var(--border-subtle)] text-text-secondary bg-[color-mix(in_srgb,var(--text-primary)_2%,var(--bg))] leading-none tracking-tight">
                  {circleName}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-text-muted mt-1.5 tracking-tight">
              <span>{timeAgo(post.createdAt)}</span>
              <span className="opacity-30" aria-hidden>·</span>
              <span className="tabular-nums">{readMin} min</span>
            </div>
          </div>
        </div>
        {heat ? <span className={`text-base shrink-0 ${heat.color}`}>{heat.emoji}</span> : null}
      </div>

      {/* Title */}
      <Link href={`/post/${post.id}`}>
        <h2 className="font-post-serif text-lg sm:text-xl font-medium text-text-primary leading-tight hover:opacity-70 transition-opacity duration-300 mb-3 tracking-tight">
          {post.title}
        </h2>
      </Link>

      {/* Preview */}
      {preview ? (
        <p className="text-[15px] text-text-secondary leading-relaxed mb-4 line-clamp-2 font-normal">{preview}</p>
      ) : null}

      {/* Link */}
      {post.contentType === 'link' && post.linkUrl && (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary hover:underline decoration-[var(--border-subtle)] underline-offset-4 mb-4 truncate max-w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-text-muted opacity-50" aria-hidden>
            ↗
          </span>
          <span className="truncate">{post.linkUrl}</span>
        </a>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-5">
          {post.tags.map((tag) => (
            <Link
              key={tag}
              href={`/tag/${encodeURIComponent(tag)}`}
              className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border border-[var(--border-subtle)] text-text-secondary transition-all hover:text-text-primary hover:border-text-primary/30"
            >
              #{tag}
            </Link>
          ))}
        </div>
      ) : null}

      {/* Temperature bar — slim */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-text-muted mb-2.5 opacity-80">
          <span>{t('feed.sentimentGauge')}</span>
          {activityText ? (
            <span className="font-medium text-text-secondary normal-case tracking-normal">
              {activityText}
            </span>
          ) : (
            <span className="normal-case tracking-normal opacity-50">—</span>
          )}
        </div>
        <TemperatureBar temperature={post.temperature} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-4">
        <div className="flex items-center min-w-0">
          <VoteButton
            postId={post.id}
            voterCount={post.voterCount}
            totalVoteAmount={post.totalVoteAmount}
            disagreeVoteAmount={post.disagreeVoteAmount}
            userVoteType={post.userVoteType}
            queryKey={feedQueryKey}
            isAuthorCapReached={capReached}
            variant="compact"
          />
        </div>
        <div className="flex items-center gap-5 shrink-0">
          <Link
            href={`/post/${post.id}`}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            <span className="opacity-70">💬</span>
            <span>{post.commentCount}</span>
          </Link>
          <button
            type="button"
            onClick={onShare}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
            title={shareState === 'copied' ? t('post.copied') : shareState === 'failed' ? t('post.copyFailed') : t('post.share')}
          >
            <span className="opacity-70">↗</span>
            <span className="hidden sm:inline">{shareState === 'idle' ? t('post.share') : shareState === 'copied' ? t('post.copied') : t('post.copyFailed')}</span>
          </button>
          {ownerDelete.isOwner ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                ownerDelete.requestDelete()
              }}
              disabled={ownerDelete.isPending}
              className="text-xs text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors shrink-0"
            >
              {ownerDelete.isPending ? '…' : t('post.delete')}
            </button>
          ) : null}
        </div>
      </div>

      {/* AG stat — subtle */}
      {post.totalVoteAmount > 0 ? (
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--border-subtle)] border-dashed">
          <span className="text-xs text-text-primary tabular-nums font-medium tracking-tight">
            {formatCoins(post.totalVoteAmount)} AG
          </span>
          {post.disagreeVoteAmount > 0 ? (
            <span className="text-xs text-text-muted tabular-nums tracking-tight">{formatCoins(post.disagreeVoteAmount)}</span>
          ) : null}
          <span className="text-[10px] text-text-muted ml-auto tabular-nums tracking-wider uppercase">
            {post.voterCount} {t('feed.statVoters') as string}
          </span>
        </div>
      ) : null}
    </>
  )
}
