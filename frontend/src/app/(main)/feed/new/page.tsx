'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

const schema = z.object({
  title: z.string().min(1, 'Title required').max(300),
  content: z.string().min(1, 'Content required'),
  contentType: z.enum(['markdown', 'link', 'image']),
  linkUrl: z.string().url().optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

export default function NewPostPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { contentType: 'markdown' },
  })

  const contentType = watch('contentType')

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const body: Record<string, string> = {
        title: data.title,
        content: data.content,
        contentType: data.contentType,
      }
      if (data.contentType === 'link' && data.linkUrl) {
        body.linkUrl = data.linkUrl
      }
      return apiClient.post('/api/posts', body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      router.replace('/feed')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setServerError(msg ?? 'Failed to create post')
    },
  })

  async function onSubmit(data: FormData) {
    setServerError('')
    mutation.mutate(data)
  }

  const inputClass =
    'w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-700 transition-colors text-sm'

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">New Post</h1>
        <button
          onClick={() => router.back()}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Content type selector */}
        <div className="flex gap-2">
          {(['markdown', 'link'] as const).map((type) => (
            <label key={type} className="flex items-center gap-1.5 cursor-pointer">
              <input
                {...register('contentType')}
                type="radio"
                value={type}
                className="accent-emerald-500"
              />
              <span className="text-sm text-zinc-400 capitalize">{type}</span>
            </label>
          ))}
        </div>

        <div>
          <input {...register('title')} placeholder="Title" className={inputClass} />
          {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
        </div>

        <div>
          <textarea
            {...register('content')}
            placeholder={contentType === 'link' ? 'Describe this link…' : 'What\'s on your mind?'}
            rows={6}
            className={inputClass + ' resize-none'}
          />
          {errors.content && <p className="mt-1 text-xs text-red-400">{errors.content.message}</p>}
        </div>

        {contentType === 'link' && (
          <div>
            <input
              {...register('linkUrl')}
              type="url"
              placeholder="https://…"
              className={inputClass}
            />
            {errors.linkUrl && <p className="mt-1 text-xs text-red-400">{errors.linkUrl.message}</p>}
          </div>
        )}

        {serverError && <p className="text-sm text-red-400">{serverError}</p>}

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-zinc-600">+5 coins reward for posting</p>
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {mutation.isPending ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </form>
    </div>
  )
}
