'use client'

import Link from 'next/link'
import type { Post } from '@/lib/types'
import { timeAgo, heatBadge, formatCoins } from '@/lib/utils'
import VoteButton from './vote-button'

interface Props {
  post: Post
  feedQueryKey: string[]
}

function TemperatureBar({ temperature }: { temperature: string }) {
  const t = parseFloat(temperature)
  if (t <= 0) return null

  const pct = Math.min((t / 1000) * 100, 100)
  const color =
    t >= 1000
      ? 'bg-red-500'
      : t >= 500
      ? 'bg-orange-400'
      : t >= 100
      ? 'bg-amber-400'
      : 'bg-emerald-500'

  return (
    <div className="flex items-center gap-2 text-xs text-text-muted mb-2.5">
      <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-mono text-[11px] ${t >= 500 ? 'text-amber-400' : 'text-text-muted'}`}>
        {t >= 1 ? Math.round(t) : t.toFixed(1)}
      </span>
    </div>
  )
}

export default function PostCard({ post, feedQueryKey }: Props) {
  const heat = heatBadge(post.temperature)
  const preview = post.content
    ? post.content.slice(0, 160) + (post.content.length > 160 ? '…' : '')
    : ''

  return (
    <article className="bg-surface border border-border-subtle rounded-xl p-4 hover:border-zinc-400/50 dark:hover:border-zinc-600/50 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-text-secondary shrink-0">
            {(post.author.displayName ?? post.author.username).charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-text-secondary truncate">
            <Link
              href={`/user/${post.author.username}`}
              className="text-text-primary font-medium hover:text-emerald-400 transition-colors"
            >
              {post.author.displayName ?? post.author.username}
            </Link>
            <span className="mx-1.5 text-text-muted">·</span>
            <span className="text-xs">{timeAgo(post.createdAt)}</span>
          </span>
        </div>
        {heat && (
          <span className={`text-xs font-medium shrink-0 ${heat.color}`}>{heat.emoji}</span>
        )}
      </div>

      {/* Title */}
      <Link href={`/post/${post.id}`}>
        <h2 className="text-text-primary font-semibold leading-snug mb-1.5 hover:text-emerald-400 transition-colors">
          {post.title}
        </h2>
      </Link>

      {/* Content preview */}
      {preview && (
        <p className="text-sm text-text-muted leading-relaxed mb-2.5 line-clamp-2">{preview}</p>
      )}

      {/* Link preview */}
      {post.contentType === 'link' && post.linkUrl && (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-emerald-600 dark:text-emerald-500 hover:text-emerald-500 dark:hover:text-emerald-400 mb-2.5 truncate"
        >
          🔗 {post.linkUrl}
        </a>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {post.tags.map((tag) => (
            <Link
              key={tag}
              href={`/tag/${tag}`}
              className="text-xs px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-text-muted hover:text-emerald-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* Temperature bar */}
      <TemperatureBar temperature={post.temperature} />

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-border-subtle">
        <VoteButton
          postId={post.id}
          voterCount={post.voterCount}
          totalVoteAmount={post.totalVoteAmount}
          hasVoted={post.hasVoted}
          queryKey={feedQueryKey}
        />
        <Link
          href={`/post/${post.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          💬 {post.commentCount}
        </Link>
        <span className="text-xs text-text-muted">👁 {post.viewCount}</span>
      </div>
    </article>
  )
}
