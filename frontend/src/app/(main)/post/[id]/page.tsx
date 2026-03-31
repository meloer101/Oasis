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
import { useLocale } from '@/hooks/use-locale'
import { PostHtmlContent } from '@/components/post/post-html-content'

export default function PostPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { t } = useLocale()
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
      <div className="text-center py-16 text-text-muted text-sm">
        {t('post.notFound')}{' '}
        <button onClick={() => router.back()} className="text-emerald-400 hover:text-emerald-300">
          {t('post.goBack')}
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="text-sm text-text-muted hover:text-text-secondary transition-colors mb-5 flex items-center gap-1"
      >
        {t('post.back')}
      </button>

      <div className="bg-surface border border-border-subtle rounded-xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-text-secondary">
            {(post.author.displayName ?? post.author.username).charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-text-secondary">
            <span className="text-text-primary font-medium">
              {post.author.displayName ?? post.author.username}
            </span>
            <span className="mx-1.5 text-text-muted">·</span>
            {timeAgo(post.createdAt)}
          </span>
        </div>

        <h1 className="text-xl font-bold text-text-primary leading-snug mb-3">{post.title}</h1>

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
              <p className="text-text-secondary text-sm leading-relaxed">{post.content}</p>
            )}
          </>
        ) : post.contentType === 'rich' && post.content ? (
          <PostHtmlContent html={post.content} />
        ) : (
          <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {post.tags.map((tag) => (
              <a
                key={tag}
                href={`/tag/${tag}`}
                className="text-xs px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-text-muted hover:text-emerald-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              >
                #{tag}
              </a>
            ))}
          </div>
        )}

        <div className="flex items-center gap-5 mt-4 pt-4 border-t border-border-subtle text-xs text-text-muted flex-wrap">
          <span>
            👁 {post.viewCount} {t('post.views')}
          </span>
          <span>
            💬 {post.commentCount} {t('post.comments')}
          </span>
          {post.voterCount > 0 && (
            <span>
              ⚡{' '}
              {t('post.agreeStats', {
                count: post.voterCount,
                amount: formatCoins(post.totalVoteAmount),
              })}
            </span>
          )}
          {parseFloat(post.temperature) > 0 && (
            <span>🌡️ {Math.round(parseFloat(post.temperature))}</span>
          )}
        </div>

        <div className="mt-4">
          <VoteButton
            postId={post.id}
            voterCount={post.voterCount}
            totalVoteAmount={post.totalVoteAmount}
            hasVoted={post.hasVoted ?? false}
            queryKey={['post', id]}
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-text-secondary mb-3">
          {t('post.commentsHeading')} {comments && comments.length > 0 ? `(${comments.length})` : ''}
        </h2>

        <CommentForm postId={id} />

        {commentsLoading && (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-zinc-400 dark:border-zinc-700 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {comments && comments.length > 0 && (
          <div className="mt-4 space-y-0 divide-y divide-border-subtle">
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
          <p className="text-sm text-text-muted text-center py-6">{t('post.noComments')}</p>
        )}
      </div>
    </div>
  )
}

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
  const { t } = useLocale()

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
        placeholder={parentId ? t('post.replyPlaceholder') : t('post.commentPlaceholder')}
        rows={parentId ? 2 : 3}
        className="flex-1 bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-700 transition-colors resize-none"
      />
      <button
        onClick={() => mutation.mutate()}
        disabled={!content.trim() || mutation.isPending}
        className="self-end px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors shrink-0"
      >
        {mutation.isPending ? '…' : t('post.post')}
      </button>
    </div>
  )
}

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
  const { t } = useLocale()

  return (
    <div className="py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-text-secondary">
          {(comment.author.displayName ?? comment.author.username).charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium text-text-primary">
          {comment.author.displayName ?? comment.author.username}
        </span>
        <span className="text-xs text-text-muted">{timeAgo(comment.createdAt)}</span>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed ml-7 mb-1.5">{comment.content}</p>
      <button
        onClick={() => setReplying((v) => !v)}
        className="text-xs text-text-muted hover:text-text-secondary transition-colors ml-7"
      >
        {t('post.reply')}
      </button>

      {replying && (
        <div className="ml-7 mt-2">
          <CommentForm postId={postId} parentId={comment.id} onDone={() => setReplying(false)} />
        </div>
      )}

      {replies.length > 0 && (
        <div className="ml-7 mt-2 pl-3 border-l border-border-subtle space-y-2">
          {replies.map((r) => (
            <div key={r.id}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-text-secondary">
                  {r.author.displayName ?? r.author.username}
                </span>
                <span className="text-xs text-text-muted">{timeAgo(r.createdAt)}</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
