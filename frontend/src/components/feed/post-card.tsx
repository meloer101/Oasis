'use client'

import Link from 'next/link'
import type { Post } from '@/lib/types'
import { timeAgo, heatBadge, estimateReadingMinutes, tagHue, sentimentActivityParts, formatCoins } from '@/lib/utils'
import VoteButton from './vote-button'
import { TemperatureBar } from './temperature-bar'
import { stripHtmlToText } from '@/lib/html'
import { useLocale } from '@/hooks/use-locale'
import { Avatar } from '@/components/ui/avatar'

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
      <article className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] transition-shadow hover:shadow-md overflow-hidden">
        <Link href={`/post/${post.id}`} className="relative block min-h-[280px] sm:min-h-[340px] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" aria-hidden />
          <div className="relative z-[1] flex flex-col justify-end min-h-[280px] sm:min-h-[340px] p-5 sm:p-6 text-left">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-md bg-brand/95 text-brand-foreground shadow-sm">
                {t('feed.featuredInsight')}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/80">
                {timeAgo(post.createdAt)}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-3 drop-shadow-sm">
              {post.title}
            </h2>
            {preview ? (
              <p className="text-sm text-white/80 leading-relaxed mb-3 line-clamp-2 drop-shadow-sm">{preview}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3 mt-auto">
              <Avatar
                src={post.author.avatarUrl}
                name={post.author.displayName ?? post.author.username}
                className="w-9 h-9 rounded-full bg-white/20 shrink-0 text-sm ring-2 ring-white/40"
                textClassName="text-white"
              />
              <div className="min-w-0">
                <Link
                  href={`/user/${post.author.username}`}
                  className="font-semibold text-white hover:text-sky-200 transition-colors text-sm block truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.author.displayName ?? post.author.username}
                </Link>
              </div>
              {post.tags && post.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto sm:ml-auto">
                  {post.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border border-white/35 text-white/95 bg-black/25"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </Link>

        <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
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
          <div className="flex items-center gap-4 shrink-0">
            <Link
              href={`/post/${post.id}`}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              💬 {post.commentCount}
            </Link>
            {activityText ? (
              <span className="text-xs font-semibold text-amber-500 dark:text-amber-400 tabular-nums hidden sm:inline">
                {activityText}
              </span>
            ) : null}
            <span className="text-[11px] text-text-muted tabular-nums">{readMin} min</span>
          </div>
        </div>
      </article>
    )
  }

  // ── mediaLeft (thumbnail on left) ────────────────────────────────────────
  if (mediaLeft && post.imageUrl && !featured) {
    return (
      <article className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] transition-shadow hover:shadow-md overflow-hidden flex flex-col sm:flex-row">
        <Link
          href={`/post/${post.id}`}
          className="relative block w-full sm:w-40 shrink-0 aspect-[16/10] sm:aspect-auto sm:min-h-[7rem] bg-brand-muted overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.imageUrl} alt="" className="h-full w-full object-cover min-h-[7rem]" />
        </Link>
        <div className="flex-1 min-w-0 p-4">
          <StandardCardBody
            post={post}
            feedQueryKey={feedQueryKey}
            preview={preview}
            readMin={readMin}
            capReached={capReached}
            activityText={activityText}
            circleName={circleName}
            heat={heat}
          />
        </div>
      </article>
    )
  }

  // ── Standard card ─────────────────────────────────────────────────────────
  return (
    <article className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] transition-shadow hover:shadow-md overflow-hidden">
      {post.imageUrl ? (
        <Link href={`/post/${post.id}`} className="block overflow-hidden bg-brand-muted/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt=""
            className="w-full h-44 sm:h-52 object-cover hover:opacity-95 transition-opacity"
          />
        </Link>
      ) : null}
      <div className="p-4 sm:p-5">
        <StandardCardBody
          post={post}
          feedQueryKey={feedQueryKey}
          preview={preview}
          readMin={readMin}
          capReached={capReached}
          activityText={activityText}
          circleName={circleName}
          heat={heat}
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
}: {
  post: Post
  feedQueryKey: string[]
  preview: string
  readMin: number
  capReached: boolean
  activityText: string | null
  circleName: string | undefined
  heat: ReturnType<typeof heatBadge>
}) {
  const { t } = useLocale()

  return (
    <>
      {/* Author row */}
      <div className="flex items-center gap-2 mb-3 min-w-0">
        <Avatar
          src={post.author.avatarUrl}
          name={post.author.displayName ?? post.author.username}
          className="w-8 h-8 rounded-full bg-brand-muted dark:bg-surface shrink-0 text-xs font-bold"
          textClassName="text-text-secondary"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/user/${post.author.username}`}
              className="text-sm font-semibold text-text-primary hover:text-brand transition-colors leading-none"
            >
              {post.author.displayName ?? post.author.username}
            </Link>
            {circleName ? (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-muted text-brand border border-brand/20 leading-none">
                {circleName}
              </span>
            ) : null}
            <span className="text-xs text-text-muted leading-none">{timeAgo(post.createdAt)}</span>
          </div>
        </div>
        {heat ? (
          <span className={`text-sm shrink-0 ${heat.color}`}>{heat.emoji}</span>
        ) : null}
      </div>

      {/* Title */}
      <Link href={`/post/${post.id}`}>
        <h2 className="text-base sm:text-lg font-bold text-text-primary leading-snug hover:text-brand transition-colors mb-2">
          {post.title}
        </h2>
      </Link>

      {/* Preview */}
      {preview ? (
        <p className="text-sm text-text-muted leading-relaxed mb-3 line-clamp-2">{preview}</p>
      ) : null}

      {/* Link */}
      {post.contentType === 'link' && post.linkUrl && (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-brand hover:underline mb-3 truncate"
          onClick={(e) => e.stopPropagation()}
        >
          🔗 {post.linkUrl}
        </a>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.tags.map((tag) => {
            const hue = tagHue(tag)
            return (
              <Link
                key={tag}
                href={`/tag/${encodeURIComponent(tag)}`}
                className="text-xs font-medium px-2 py-0.5 rounded-full border border-[var(--card-border)] transition-colors hover:opacity-80"
                style={{ color: `hsl(${hue}, 45%, 42%)` }}
              >
                #{tag}
              </Link>
            )
          })}
        </div>
      ) : null}

      {/* Temperature bar — slim */}
      <div className="mb-3">
        <TemperatureBar temperature={post.temperature} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--card-border)]">
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
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/post/${post.id}`}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            <span>💬</span>
            <span>{post.commentCount}</span>
          </Link>
          {activityText ? (
            <span className="hidden sm:inline text-xs font-semibold text-amber-500 dark:text-amber-400 tabular-nums">
              {activityText}
            </span>
          ) : null}
          <span className="text-[11px] text-text-muted tabular-nums">
            {readMin} min
          </span>
        </div>
      </div>

      {/* AG stat — subtle */}
      {post.totalVoteAmount > 0 ? (
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[var(--card-border)]">
          <span className="text-xs text-sage tabular-nums font-medium">
            ⚡ {formatCoins(post.totalVoteAmount)} AG
          </span>
          {post.disagreeVoteAmount > 0 ? (
            <span className="text-xs text-orange-400 tabular-nums">
              💧 {formatCoins(post.disagreeVoteAmount)}
            </span>
          ) : null}
          <span className="text-[10px] text-text-muted ml-auto tabular-nums">
            {post.voterCount} {t('feed.statVoters') as string}
          </span>
        </div>
      ) : null}
    </>
  )
}
