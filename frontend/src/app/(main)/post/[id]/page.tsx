'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePost, useComments } from '@/hooks/use-post'
import { apiClient } from '@/lib/api-client'
import { timeAgo, formatCoins } from '@/lib/utils'
import VoteButton from '@/components/feed/vote-button'
import type { Comment } from '@/lib/types'
import { useAuth } from '@/providers/auth-provider'

export default function PostPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { data: post, isLoading: postLoading, error: postError } = usePost(id)
  const { data: comments, isLoading: commentsLoading } = useComments(id)

  if (postLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (postError || !post) {
    return (
      <div className="text-center py-16 text-zinc-500 text-sm">
        Post not found.{' '}
        <button onClick={() => router.back()} className="text-emerald-400 hover:text-emerald-300">
          Go back
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-5 flex items-center gap-1"
      >
        ← Back
      </button>

      {/* Post */}
      <div className="bg-zinc-900 border border-zinc-800/50 rounded-xl p-5 mb-5">
        {/* Author */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300">
            {(post.author.displayName ?? post.author.username).charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-zinc-400">
            <span className="text-zinc-300 font-medium">
              {post.author.displayName ?? post.author.username}
            </span>
            <span className="mx-1.5 text-zinc-600">·</span>
            {timeAgo(post.createdAt)}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-zinc-100 leading-snug mb-3">{post.title}</h1>

        {/* Content */}
        {post.contentType === 'link' && post.linkUrl ? (
          <>
            <a
              href={post.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-500 hover:text-emerald-400 block mb-3 break-all"
            >
              🔗 {post.linkUrl}
            </a>
            {post.content && (
              <p className="text-zinc-300 text-sm leading-relaxed">{post.content}</p>
            )}
          </>
        ) : (
          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-5 mt-4 pt-4 border-t border-zinc-800/50 text-xs text-zinc-500">
          <span>👁 {post.viewCount} views</span>
          <span>💬 {post.commentCount} comments</span>
          {post.voterCount > 0 && (
            <span>⚡ {post.voterCount} agreed · {formatCoins(post.totalVoteAmount)} coins</span>
          )}
        </div>

        {/* Vote */}
        <div className="mt-4">
          <VoteButton
            postId={post.id}
            voterCount={post.voterCount}
            totalVoteAmount={post.totalVoteAmount}
            queryKey={['post', id]}
          />
        </div>
      </div>

      {/* Comments */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 mb-3">
          Comments {comments && comments.length > 0 ? `(${comments.length})` : ''}
        </h2>

        <CommentForm postId={id} />

        {commentsLoading && (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {comments && comments.length > 0 && (
          <div className="mt-4 space-y-0 divide-y divide-zinc-800/50">
            {comments
              .filter((c) => !c.parentId)
              .map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  replies={comments.filter((c) => c.parentId === comment.id)}
                  postId={id}
                />
              ))}
          </div>
        )}

        {!commentsLoading && comments?.length === 0 && (
          <p className="text-sm text-zinc-600 text-center py-6">No comments yet.</p>
        )}
      </div>
    </div>
  )
}

// ─── Comment Form ────────────────────────────────────────────────────────────

function CommentForm({
  postId,
  parentId,
  onDone,
}: {
  postId: string
  parentId?: string
  onDone?: () => void
}) {
  const [content, setContent] = useState('')
  const queryClient = useQueryClient()
  const { refreshBalance } = useAuth()

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/api/posts/${postId}/comments`, {
        content,
        ...(parentId ? { parentId } : {}),
      }),
    onSuccess: () => {
      setContent('')
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      refreshBalance()
      onDone?.()
    },
  })

  return (
    <div className="flex gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? 'Reply…' : 'Add a comment… (+2 coins)'}
        rows={parentId ? 2 : 3}
        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-700 transition-colors resize-none"
      />
      <button
        onClick={() => mutation.mutate()}
        disabled={!content.trim() || mutation.isPending}
        className="self-end px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors shrink-0"
      >
        {mutation.isPending ? '…' : 'Post'}
      </button>
    </div>
  )
}

// ─── Comment Thread ───────────────────────────────────────────────────────────

function CommentThread({
  comment,
  replies,
  postId,
}: {
  comment: Comment
  replies: Comment[]
  postId: string
}) {
  const [replying, setReplying] = useState(false)

  return (
    <div className="py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-400">
          {(comment.author.displayName ?? comment.author.username).charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium text-zinc-300">
          {comment.author.displayName ?? comment.author.username}
        </span>
        <span className="text-xs text-zinc-600">{timeAgo(comment.createdAt)}</span>
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed ml-7 mb-1.5">{comment.content}</p>
      <button
        onClick={() => setReplying((v) => !v)}
        className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors ml-7"
      >
        Reply
      </button>

      {replying && (
        <div className="ml-7 mt-2">
          <CommentForm postId={postId} parentId={comment.id} onDone={() => setReplying(false)} />
        </div>
      )}

      {replies.length > 0 && (
        <div className="ml-7 mt-2 pl-3 border-l border-zinc-800/50 space-y-2">
          {replies.map((r) => (
            <div key={r.id}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-zinc-400">
                  {r.author.displayName ?? r.author.username}
                </span>
                <span className="text-xs text-zinc-700">{timeAgo(r.createdAt)}</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
