export type ShareResult = 'shared' | 'copied' | 'prompt' | 'failed'

export async function shareUrl({ url, title }: { url: string; title?: string }): Promise<ShareResult> {
  if (typeof window === 'undefined') return 'failed'

  try {
    if (navigator.share) {
      await navigator.share({ url, title })
      return 'shared'
    }
  } catch {
    // fall through to copy
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return 'copied'
    }
  } catch {
    // fall through to prompt
  }

  try {
    window.prompt('Copy link:', url)
    return 'prompt'
  } catch {
    return 'failed'
  }
}

