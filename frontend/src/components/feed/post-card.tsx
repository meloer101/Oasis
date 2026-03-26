'use client'

import Link from 'next/link'
import type { Post } from '@/lib/types'
import { timeAgo, heatBadge } from '@/lib/utils'
import VoteButton from './vote-button'

interface Props {
  post: Post
  feedQueryKey: string[]
}

export default function PostCard({ post, feedQueryKey }: Props) {
  const heat = heatBadge(post.temperature)
  const preview = post.content ? post.content.slice(0, 180) + (post.content.length > 180 ? '…' : '') : ''

  return (
    <article className="bg-zinc-900 border border-zinc-800/50 rounded-xl p-4 hover:border-zinc-700/50 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 shrink-0">
            {(post.author.displayName ?? post.author.username).charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-zinc-400 truncate">
            <span className="text-zinc-300 font-medium">
              {post.author.displayName ?? post.author.username}
            </span>
            <span className="mx-1.5 text-zinc-600">·</span>
            <span className="text-xs">{timeAgo(post.createdAt)}</span>
          </span>
        </div>
        {heat && (
          <span className={`text-xs font-medium shrink-0 ${heat.color}`}>
            {heat.emoji}
          </span>
        )}
      </div>

      {/* Title */}
      <Link href={`/post/${post.id}`}>
        <h2 className="text-zinc-100 font-semibold leading-snug mb-1.5 hover:text-emerald-400 transition-colors">
          {post.title}
        </h2>
      </Link>

      {/* Content preview */}
      {preview && (
        <p className="text-sm text-zinc-500 leading-relaxed mb-3 line-clamp-2">{preview}</p>
      )}

      {/* Link preview */}
      {post.contentType === 'link' && post.linkUrl && (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-emerald-500 hover:text-emerald-400 mb-3 truncate"
        >
          🔗 {post.linkUrl}
        </a>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-zinc-800/50">
        <VoteButton
          postId={post.id}
          voterCount={post.voterCount}
          totalVoteAmount={post.totalVoteAmount}
          queryKey={feedQueryKey}
        />
        <Link
          href={`/post/${post.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          💬 {post.commentCount}
        </Link>
        <span className="text-xs text-zinc-700">
          👁 {post.viewCount}
        </span>
      </div>
    </article>
  )
}
