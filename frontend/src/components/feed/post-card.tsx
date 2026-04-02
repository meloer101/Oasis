'use client'

import Link from 'next/link'
import type { Post } from '@/lib/types'
import { timeAgo, heatBadge } from '@/lib/utils'
import VoteButton from './vote-button'
import { TemperatureBar } from './temperature-bar'
import { stripHtmlToText } from '@/lib/html'

interface Props {
  post: Post
  feedQueryKey: string[]
}

export default function PostCard({ post, feedQueryKey }: Props) {
  const heat = heatBadge(post.temperature)
  const previewPlain =
    post.contentType === 'rich' && post.content
      ? stripHtmlToText(post.content)
      : post.content ?? ''
  const preview = previewPlain
    ? previewPlain.slice(0, 160) + (previewPlain.length > 160 ? '…' : '')
    : ''

  return (
    <article className="bg-surface border border-border-subtle rounded-xl px-4 py-3 hover:border-zinc-400/50 dark:hover:border-zinc-600/50 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-text-secondary shrink-0">
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
            {post.circle && (
              <>
                <span className="mx-1.5 text-text-muted">·</span>
                <Link
                  href={`/circle/${post.circle.id}`}
                  className="text-xs text-emerald-600 dark:text-emerald-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  📍 {post.circle.name}
                </Link>
              </>
            )}
          </span>
        </div>
        {heat && (
          <span className={`text-xs font-medium shrink-0 ${heat.color}`}>{heat.emoji}</span>
        )}
      </div>

      {/* Title */}
      <Link href={`/post/${post.id}`}>
        <h2 className="text-text-primary font-semibold leading-snug mb-1 hover:text-emerald-400 transition-colors">
          {post.title}
        </h2>
      </Link>

      {/* Content preview */}
      {preview && (
        <p className="text-sm text-text-muted leading-relaxed mb-1 line-clamp-2">{preview}</p>
      )}

      {/* Link preview */}
      {post.contentType === 'link' && post.linkUrl && (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-emerald-600 dark:text-emerald-500 hover:text-emerald-500 dark:hover:text-emerald-400 mb-1 truncate"
        >
          🔗 {post.linkUrl}
        </a>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
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

      {/* Actions + temperature bar */}
      <div className="flex items-center gap-3 pt-1.5 border-t border-border-subtle">
        <VoteButton
          postId={post.id}
          voterCount={post.voterCount}
          totalVoteAmount={post.totalVoteAmount}
          disagreeVoteAmount={post.disagreeVoteAmount}
          userVoteType={post.userVoteType}
          queryKey={feedQueryKey}
          isAuthorCapReached={Math.floor(post.totalVoteAmount * 0.8) >= 200}
        />
        <Link
          href={`/post/${post.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          💬 {post.commentCount}
        </Link>
        <span className="text-xs text-text-muted">👁 {post.viewCount}</span>
        <TemperatureBar temperature={post.temperature} />
      </div>
    </article>
  )
}
