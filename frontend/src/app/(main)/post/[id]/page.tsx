'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePost, useComments, getCircleOnlyGateFromError } from '@/hooks/use-post'
import { apiClient } from '@/lib/api-client'
import { timeAgo, formatCoins, estimateReadingMinutes } from '@/lib/utils'
import { stripHtmlToText } from '@/lib/html'
import VoteButton from '@/components/feed/vote-button'
import { TemperatureBar } from '@/components/feed/temperature-bar'
import type { Comment } from '@/lib/types'
import { useAuth } from '@/providers/auth-provider'
import { useLocale } from '@/hooks/use-locale'
import { PostHtmlContent } from '@/components/post/post-html-content'
import Link from 'next/link'
import { Avatar } from '@/components/ui/avatar'
import { shareUrl } from '@/lib/share'
import { PostDetailSkeleton } from '@/components/ui/skeletons'

export default function PostPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { t } = useLocale()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: post, isLoading: postLoading, error: postError } = usePost(id)
  const { data: comments, isLoading: commentsLoading } = useComments(id, { enabled: !!post })
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      router.back()
    },
  })

  function shareLabel() {
    if (shareState === 'copied') return t('post.copied')
    if (shareState === 'failed') return t('post.copyFailed')
    return t('post.share')
  }

  useEffect(() => {
    if (shareState === 'idle') return
    const timer = window.setTimeout(() => setShareState('idle'), 1500)
    return () => window.clearTimeout(timer)
  }, [shareState])

  async function sharePost() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const result = await shareUrl({ url, title: post?.title ?? undefined })
    if (result === 'failed') setShareState('failed')
    else setShareState('copied')
  }

  if (postLoading) {
    return <PostDetailSkeleton />
  }

  const circleOnlyGate = getCircleOnlyGateFromError(postError)
  if (circleOnlyGate) {
    return (
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-text-muted hover:text-text-secondary transition-colors mb-5 flex items-center gap-1"
        >
          {t('post.back')}
        </button>
        <div className="max-w-md mx-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-text-primary">{t('post.circleOnlyTitle')}</p>
          <p className="text-sm text-text-secondary mt-3 leading-relaxed">{t('post.circleOnlyDescription')}</p>
          <p className="text-xs text-text-muted mt-2">{circleOnlyGate.name}</p>
          <Link
            href={`/circle/${circleOnlyGate.id}`}
            className="inline-flex mt-6 px-5 py-2.5 bg-brand text-brand-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            {t('post.viewCircle')}
          </Link>
        </div>
      </div>
    )
  }

  if (postError || !post) {
    return (
      <div className="text-center py-16 text-text-muted text-sm">
        {t('post.notFound')}{' '}
        <button type="button" onClick={() => router.back()} className="text-text-primary underline underline-offset-2 hover:opacity-80">
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
            className="w-10 h-10 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-center text-base hover:border-[color-mix(in_srgb,var(--text-primary)_28%,var(--card-border))] transition-colors"
            title={t('post.commentsHeading')}
          >
            💬
          </a>
          <button
            type="button"
            onClick={sharePost}
            className="w-10 h-10 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-center text-base hover:border-[color-mix(in_srgb,var(--text-primary)_28%,var(--card-border))] transition-colors"
            title={t('post.share')}
          >
            ↗
          </button>
        </div>

        <article className="flex-1 min-w-0 max-w-3xl">
          {post.imageUrl ? (
            <div className="rounded-xl overflow-hidden border border-[var(--card-border)] mb-6 max-h-[420px] bg-[color-mix(in_srgb,var(--text-primary)_5%,var(--card-bg))]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.imageUrl} alt="" className="w-full max-h-[420px] object-cover" />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 mb-3">
            {post.tags && post.tags.length > 0 ? (
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border border-[var(--card-border)] text-text-secondary bg-[color-mix(in_srgb,var(--text-primary)_5%,var(--card-bg))]">
                {post.tags[0]}
              </span>
            ) : null}
            <span className="text-xs text-text-muted">
              {t('post.readTime').replace(
                '{min}',
                String(
                  estimateReadingMinutes(
                    post.contentType === 'rich' && post.content
                      ? stripHtmlToText(post.content)
                      : (post.content ?? ''),
                  ),
                ),
              )}
            </span>
          </div>

          <h1 className="font-post-serif text-3xl sm:text-4xl font-bold text-text-primary leading-tight mb-4">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 mb-6 justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                src={post.author.avatarUrl}
                name={post.author.displayName ?? post.author.username}
                className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--text-primary)_8%,var(--card-bg))] dark:bg-surface shrink-0 text-sm"
                textClassName="text-text-secondary"
              />
              <div className="min-w-0">
                <Link
                  href={`/user/${post.author.username}`}
                  className="font-semibold text-text-primary hover:underline underline-offset-2 block truncate"
                >
                  {post.author.displayName ?? post.author.username}
                </Link>
                <p className="text-xs text-text-muted">{timeAgo(post.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={sharePost}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-primary border border-[var(--card-border)] rounded-lg px-3 py-1.5 hover:bg-nav-hover transition-colors"
              >
                ↗ {shareState === 'idle' ? t('post.distribute') : shareLabel()}
              </button>
              {user?.id === post.author.id && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('post.deleteConfirm'))) {
                      deleteMutation.mutate()
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="text-xs text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors"
                >
                  {t('post.delete')}
                </button>
              )}
            </div>
          </div>

          {post.tags && post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-6">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tag/${encodeURIComponent(tag)}`}
                  className="text-sm font-medium text-text-secondary rounded px-1 -mx-1 hover:bg-nav-hover hover:text-text-primary"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          ) : null}

          {/* Mobile / tablet stake consensus */}
          <div className="lg:hidden mb-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-md ring-1 ring-[color-mix(in_srgb,var(--text-primary)_6%,transparent)] overflow-hidden">
            <div className="p-4 border-b border-[var(--card-border)] flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
                  {t('post.stakeConsensus')}
                </p>
                <p className="text-xs text-text-secondary mt-1">{t('post.stakeConsensusSubtitle')}</p>
              </div>
              <p className="text-xl font-bold text-text-primary tabular-nums text-right">
                {formatCoins(post.totalVoteAmount)}{' '}
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">AG</span>
              </p>
            </div>
            <div className="p-4">
              <VoteButton
                postId={post.id}
                voterCount={post.voterCount}
                totalVoteAmount={post.totalVoteAmount}
                disagreeVoteAmount={post.disagreeVoteAmount}
                userVoteType={post.userVoteType ?? null}
                queryKey={['post', id]}
                isAuthorCapReached={Math.floor(post.totalVoteAmount * 0.8) >= 200}
                variant="default"
                stackedActions
              />
            </div>
          </div>

          <div className="max-w-none text-[1.05rem] leading-relaxed [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6">
            {post.contentType === 'link' && post.linkUrl ? (
              <>
                <a
                  href={post.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-text-primary hover:underline break-all text-lg font-medium"
                >
                  ↗ {post.linkUrl}
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

          <div className="mt-8 pt-6 border-t border-[var(--card-border)] space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted mb-2">
                {t('post.sentimentVibeGauge')}
              </p>
              <TemperatureBar temperature={post.temperature} />
              <div className="flex justify-between gap-2 mt-1.5 text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                <span className="text-left">{t('post.vibeAnalytical')}</span>
                <span className="text-center shrink-0">{t('post.vibeQuestioning')}</span>
                <span className="text-right">{t('post.vibeTrending')}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
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
	                className="sm:hidden text-text-primary text-sm font-medium"
	              >
	                {shareLabel()}
	              </button>
	            </div>
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
            <div className="w-5 h-5 border-2 border-border-subtle border-t-[var(--text-primary)] rounded-full animate-spin" />
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
        className="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--text-primary)_18%,transparent)] resize-none"
      />
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={!content.trim() || mutation.isPending}
        className="self-end sm:self-stretch px-5 py-2 bg-[var(--text-primary)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-[var(--card-bg)] text-sm rounded-xl transition-opacity shrink-0 h-fit sm:h-auto"
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
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(comment.content)
  const [editError, setEditError] = useState('')
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t } = useLocale()

  const isRemoved = (comment.status ?? 'published') === 'removed'
  const isMine = user?.id === comment.author.id
  const wasEdited = !!comment.updatedAt && comment.updatedAt !== comment.createdAt

  const editMutation = useMutation({
    mutationFn: () => apiClient.patch(`/api/comments/${comment.id}`, { content: editValue }),
    onSuccess: () => {
      setEditing(false)
      setEditError('')
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setEditError(msg ?? t('post.commentEditFailed'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/comments/${comment.id}`),
    onSuccess: () => {
      setEditError('')
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setEditError(msg ?? t('post.commentDeleteFailed'))
    },
  })

  return (
    <div className="py-4 first:pt-0">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            src={comment.author.avatarUrl}
            name={comment.author.displayName ?? comment.author.username}
            className="w-8 h-8 rounded-full bg-[color-mix(in_srgb,var(--text-primary)_8%,var(--card-bg))] dark:bg-surface text-xs"
            textClassName="text-text-secondary"
          />
          <span className="text-sm font-medium text-text-primary truncate">
            {comment.author.displayName ?? comment.author.username}
          </span>
          <span className="text-xs text-text-muted shrink-0">
            {timeAgo(comment.createdAt)}
            {wasEdited ? ` · ${t('post.edited')}` : ''}
          </span>
        </div>

        {isMine && !isRemoved && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditValue(comment.content)
                setEditing((v) => !v)
                setEditError('')
              }}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              {t('post.edit')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!deleteMutation.isPending && window.confirm(t('post.commentDeleteConfirm'))) deleteMutation.mutate()
              }}
              disabled={deleteMutation.isPending}
              className="text-xs text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors"
            >
              {deleteMutation.isPending ? '…' : t('post.delete')}
            </button>
          </div>
        )}
      </div>

      <div className="ml-10 mb-2">
        {isRemoved ? (
          <p className="text-sm text-text-muted italic">{t('post.commentDeleted')}</p>
        ) : editing ? (
          <div className="space-y-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={3}
              className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--text-primary)_18%,transparent)] resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => editMutation.mutate()}
                disabled={!editValue.trim() || editMutation.isPending}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--text-primary)] text-[var(--card-bg)] disabled:opacity-40"
              >
                {editMutation.isPending ? '…' : t('post.save')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setEditError('')
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--card-border)] text-text-secondary hover:bg-nav-hover"
              >
                {t('post.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary leading-relaxed">{comment.content}</p>
        )}

        {editError ? <p className="mt-2 text-[11px] text-red-400">{editError}</p> : null}
      </div>

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
            <ReplyItem key={r.id} comment={r} postId={postId} />
          ))}
        </div>
      )}
    </div>
  )
}

function ReplyItem({ comment, postId }: { comment: Comment; postId: string }) {
  const { t } = useLocale()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(comment.content)
  const [editError, setEditError] = useState('')

  const isRemoved = (comment.status ?? 'published') === 'removed'
  const isMine = user?.id === comment.author.id
  const wasEdited = !!comment.updatedAt && comment.updatedAt !== comment.createdAt

  const editMutation = useMutation({
    mutationFn: () => apiClient.patch(`/api/comments/${comment.id}`, { content: editValue }),
    onSuccess: () => {
      setEditing(false)
      setEditError('')
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setEditError(msg ?? t('post.commentEditFailed'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/comments/${comment.id}`),
    onSuccess: () => {
      setEditError('')
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setEditError(msg ?? t('post.commentDeleteFailed'))
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-text-secondary truncate">
            {comment.author.displayName ?? comment.author.username}
          </span>
          <span className="text-xs text-text-muted shrink-0">
            {timeAgo(comment.createdAt)}
            {wasEdited ? ` · ${t('post.edited')}` : ''}
          </span>
        </div>

        {isMine && !isRemoved && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditValue(comment.content)
                setEditing((v) => !v)
                setEditError('')
              }}
              className="text-[11px] text-text-muted hover:text-text-secondary transition-colors"
            >
              {t('post.edit')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!deleteMutation.isPending && window.confirm(t('post.commentDeleteConfirm'))) deleteMutation.mutate()
              }}
              disabled={deleteMutation.isPending}
              className="text-[11px] text-text-muted hover:text-text-secondary disabled:opacity-40 transition-colors"
            >
              {deleteMutation.isPending ? '…' : t('post.delete')}
            </button>
          </div>
        )}
      </div>

      {isRemoved ? (
        <p className="text-sm text-text-muted italic">{t('post.commentDeleted')}</p>
      ) : editing ? (
        <div className="space-y-2">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={2}
            className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--text-primary)_18%,transparent)] resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => editMutation.mutate()}
              disabled={!editValue.trim() || editMutation.isPending}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-[var(--text-primary)] text-[var(--card-bg)] disabled:opacity-40"
            >
              {editMutation.isPending ? '…' : t('post.save')}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setEditError('')
              }}
              className="px-3 py-1 text-xs font-semibold rounded-lg border border-[var(--card-border)] text-text-secondary hover:bg-nav-hover"
            >
              {t('post.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-muted leading-relaxed">{comment.content}</p>
      )}

      {editError ? <p className="mt-2 text-[11px] text-red-400">{editError}</p> : null}
    </div>
  )
}
