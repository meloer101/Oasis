'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePost, useComments } from '@/hooks/use-post'
import { apiClient } from '@/lib/api-client'
import { timeAgo, formatCoins, tagHue } from '@/lib/utils'
import VoteButton from '@/components/feed/vote-button'
import { TemperatureBar } from '@/components/feed/temperature-bar'
import type { Comment } from '@/lib/types'
import { useAuth } from '@/providers/auth-provider'
import { useLocale } from '@/hooks/use-locale'
import { PostHtmlContent } from '@/components/post/post-html-content'
import Link from 'next/link'

export default function PostPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { t } = useLocale()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: post, isLoading: postLoading, error: postError } = usePost(id)
  const { data: comments, isLoading: commentsLoading } = useComments(id)

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      router.back()
    },
  })

  function sharePost() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (navigator.share) {
      void navigator.share({ url, title: post?.title }).catch(() => copyUrl(url))
    } else {
      copyUrl(url)
    }
  }

  function copyUrl(url: string) {
    void navigator.clipboard.writeText(url).catch(() => {})
  }

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
        <button type="button" onClick={() => router.back()} className="text-emerald-400 hover:text-emerald-300">
          {t('post.goBack')}
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm text-text-muted hover:text-text-secondary transition-colors mb-5 flex items-center gap-1"
      >
        {t('post.back')}
      </button>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 relative">
        {/* Side rail — desktop */}
        <div className="hidden lg:flex flex-col items-center gap-4 sticky top-24 self-start w-14 shrink-0 z-10">
          <VoteButton
            postId={post.id}
            voterCount={post.voterCount}
            totalVoteAmount={post.totalVoteAmount}
            disagreeVoteAmount={post.disagreeVoteAmount}
            userVoteType={post.userVoteType ?? null}
            queryKey={['post', id]}
            isAuthorCapReached={Math.floor(post.totalVoteAmount * 0.8) >= 200}
            variant="rail"
          />
          <a
            href="#comments"
            className="w-10 h-10 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-center text-base hover:border-emerald-500/40 transition-colors"
            title={t('post.commentsHeading')}
          >
            💬
          </a>
          <button
            type="button"
            onClick={sharePost}
            className="w-10 h-10 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-center text-base hover:border-emerald-500/40 transition-colors"
            title={t('post.share')}
          >
            ↗
          </button>
        </div>

        <article className="flex-1 min-w-0 max-w-3xl">
          {post.imageUrl ? (
            <div className="rounded-xl overflow-hidden border border-[var(--card-border)] mb-6 max-h-[420px] bg-zinc-100 dark:bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.imageUrl} alt="" className="w-full max-h-[420px] object-cover" />
            </div>
          ) : null}

          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight mb-4">{post.title}</h1>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-10 h-10 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center text-sm font-semibold text-text-secondary shrink-0">
                {(post.author.displayName ?? post.author.username).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <Link
                  href={`/user/${post.author.username}`}
                  className="font-semibold text-text-primary hover:text-emerald-500 transition-colors block truncate"
                >
                  {post.author.displayName ?? post.author.username}
                </Link>
                <p className="text-xs text-text-muted">{timeAgo(post.createdAt)}</p>
              </div>
            </div>
            {user?.id === post.author.id && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t('post.deleteConfirm'))) {
                    deleteMutation.mutate()
                  }
                }}
                disabled={deleteMutation.isPending}
                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors ml-auto"
              >
                {t('post.delete')}
              </button>
            )}
          </div>

          {post.tags && post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-6">
              {post.tags.map((tag) => {
                const hue = tagHue(tag)
                return (
                  <Link
                    key={tag}
                    href={`/tag/${encodeURIComponent(tag)}`}
                    className="text-sm font-medium rounded px-1 -mx-1 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    style={{ color: `hsl(${hue}, 45%, 42%)` }}
                  >
                    #{tag}
                  </Link>
                )
              })}
            </div>
          ) : null}

          {/* Mobile / tablet vote row */}
          <div className="lg:hidden mb-6 p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <VoteButton
              postId={post.id}
              voterCount={post.voterCount}
              totalVoteAmount={post.totalVoteAmount}
              disagreeVoteAmount={post.disagreeVoteAmount}
              userVoteType={post.userVoteType ?? null}
              queryKey={['post', id]}
              isAuthorCapReached={Math.floor(post.totalVoteAmount * 0.8) >= 200}
              variant="default"
            />
          </div>

          <div className="max-w-none text-[1.05rem] leading-relaxed [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6">
            {post.contentType === 'link' && post.linkUrl ? (
              <>
                <a
                  href={post.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline break-all text-lg"
                >
                  🔗 {post.linkUrl}
                </a>
                {post.content ? (
                  <p className="text-text-secondary text-base leading-relaxed mt-4 whitespace-pre-wrap">{post.content}</p>
                ) : null}
              </>
            ) : post.contentType === 'rich' && post.content ? (
              <PostHtmlContent html={post.content} />
            ) : (
              <p className="text-text-secondary text-base leading-relaxed whitespace-pre-wrap">{post.content}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-8 pt-6 border-t border-[var(--card-border)] text-sm text-text-muted">
            <TemperatureBar temperature={post.temperature} />
            <span>
              👁 {post.viewCount} {t('post.views')}
            </span>
            <span>
              💬 {post.commentCount} {t('post.comments')}
            </span>
            {post.totalVoteAmount > 0 && (
              <span>
                ⚡{' '}
                {t('post.agreeStats', {
                  count: post.voterCount,
                  amount: formatCoins(post.totalVoteAmount),
                })}
              </span>
            )}
            {post.disagreeVoteAmount > 0 && (
              <span>
                💧 {formatCoins(post.disagreeVoteAmount)} {t('vote.disagreeLabel')}
              </span>
            )}
            <button
              type="button"
              onClick={sharePost}
              className="lg:hidden text-emerald-600 dark:text-emerald-400 text-sm font-medium"
            >
              {t('post.share')}
            </button>
          </div>
        </article>
      </div>

      <div id="comments" className="mt-10 scroll-mt-28">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          {t('post.commentsHeading')} {comments && comments.length > 0 ? `(${comments.length})` : ''}
        </h2>

        <CommentForm postId={id} />

        {commentsLoading && (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-zinc-400 dark:border-zinc-700 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {comments && comments.length > 0 && (
          <div className="mt-6 space-y-0 divide-y divide-[var(--card-border)]">
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
          <p className="text-sm text-text-muted text-center py-8">{t('post.noComments')}</p>
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
    <div className="flex flex-col sm:flex-row gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? t('post.replyPlaceholder') : t('post.commentPlaceholder')}
        rows={parentId ? 2 : 3}
        className="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-600/25 resize-none"
      />
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={!content.trim() || mutation.isPending}
        className="self-end sm:self-stretch px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-xl transition-colors shrink-0 h-fit sm:h-auto"
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
    <div className="py-4 first:pt-0">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-text-secondary">
          {(comment.author.displayName ?? comment.author.username).charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium text-text-primary">
          {comment.author.displayName ?? comment.author.username}
        </span>
        <span className="text-xs text-text-muted">{timeAgo(comment.createdAt)}</span>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed ml-10 mb-2">{comment.content}</p>
      <button
        type="button"
        onClick={() => setReplying((v) => !v)}
        className="text-xs text-text-muted hover:text-text-secondary transition-colors ml-10"
      >
        {t('post.reply')}
      </button>

      {replying && (
        <div className="ml-10 mt-3">
          <CommentForm postId={postId} parentId={comment.id} onDone={() => setReplying(false)} />
        </div>
      )}

      {replies.length > 0 && (
        <div className="ml-10 mt-4 pl-4 border-l-2 border-[var(--card-border)] space-y-4">
          {replies.map((r) => (
            <div key={r.id}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-text-secondary">
                  {r.author.displayName ?? r.author.username}
                </span>
                <span className="text-xs text-text-muted">{timeAgo(r.createdAt)}</span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
