'use client'

import Link from 'next/link'
import type { Post } from '@/lib/types'
import { timeAgo, heatBadge, estimateReadingMinutes, tagHue } from '@/lib/utils'
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
}

export default function PostCard({ post, feedQueryKey, featured = false }: Props) {
  const { t } = useLocale()
  const heat = heatBadge(post.temperature)
  const previewPlain =
    post.contentType === 'rich' && post.content
      ? stripHtmlToText(post.content)
      : post.content ?? ''
  const preview = previewPlain
    ? previewPlain.slice(0, 160) + (previewPlain.length > 160 ? '…' : '')
    : ''
  const readMin = estimateReadingMinutes(previewPlain)

  const capReached = Math.floor(post.totalVoteAmount * 0.8) >= 200

  return (
    <article
      className={`rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] transition-shadow hover:shadow-md ${
        featured ? 'overflow-hidden' : ''
      }`}
    >
      {featured && post.imageUrl ? (
        <Link href={`/post/${post.id}`} className="block aspect-[2.4/1] max-h-56 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
        </Link>
      ) : null}

      <div className={featured ? 'p-5 pt-4' : 'p-4'}>
        {/* Author */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              src={post.author.avatarUrl}
              name={post.author.displayName ?? post.author.username}
              className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 shrink-0 text-sm"
              textClassName="text-text-secondary"
            />
            <div className="min-w-0 text-sm">
              <Link
                href={`/user/${post.author.username}`}
                className="font-medium text-text-primary hover:text-emerald-500 transition-colors"
              >
                {post.author.displayName ?? post.author.username}
              </Link>
              <span className="text-text-muted text-xs mx-1.5">·</span>
              <span className="text-xs text-text-muted">{timeAgo(post.createdAt)}</span>
              {post.circle && (
                <>
                  <span className="text-text-muted text-xs mx-1.5">·</span>
                  <Link
                    href={`/circle/${post.circle.id}`}
                    className="text-xs text-emerald-600 dark:text-emerald-500 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {post.circle.name}
                  </Link>
                </>
              )}
            </div>
          </div>
          {heat ? (
            <span className={`text-xs font-medium shrink-0 ${heat.color}`}>{heat.emoji}</span>
          ) : null}
        </div>

        <Link href={`/post/${post.id}`}>
          <h2
            className={`text-text-primary font-bold leading-snug hover:text-emerald-500 transition-colors ${
              featured ? 'text-xl mb-2' : 'text-base mb-1.5'
            }`}
          >
            {post.title}
          </h2>
        </Link>

        {!featured && preview ? (
          <p className="text-sm text-text-muted leading-relaxed mb-2 line-clamp-2">{preview}</p>
        ) : null}

        {post.contentType === 'link' && post.linkUrl && (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-emerald-600 dark:text-emerald-500 hover:underline mb-2 truncate"
            onClick={(e) => e.stopPropagation()}
          >
            🔗 {post.linkUrl}
          </a>
        )}

        {post.tags && post.tags.length > 0 ? (
          <div className="flex flex-wrap gap-x-2 gap-y-1 mb-3">
            {post.tags.map((tag) => {
              const hue = tagHue(tag)
              return (
                <Link
                  key={tag}
                  href={`/tag/${encodeURIComponent(tag)}`}
                  className="text-sm font-medium rounded px-1 -mx-1 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  style={{ color: `hsl(${hue}, 45%, 42%)` }}
                >
                  #{tag}
                </Link>
              )
            })}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3 border-t border-[var(--card-border)]">
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
          <Link
            href={`/post/${post.id}`}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors shrink-0"
          >
            💬 {t('feed.metaComments').replace('{count}', String(post.commentCount))}
          </Link>
          <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
            <TemperatureBar temperature={post.temperature} compact />
            <span className="text-[11px] text-text-muted tabular-nums">
              {t('post.readTime').replace('{min}', String(readMin))}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}
