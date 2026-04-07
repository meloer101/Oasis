/**
 * Shape-aware removal of a post from TanStack Query cached data (arrays, tag bundles, infinite pages).
 */
export function removePostFromCachedQueryData(data: unknown, postId: string): unknown {
  if (data == null) return data

  if (Array.isArray(data)) {
    return data.filter((item: { id?: string }) => item?.id !== postId)
  }

  if (typeof data === 'object' && data !== null && 'posts' in data) {
    const d = data as { tag?: { postCount?: number }; posts: { id: string }[] }
    if (!Array.isArray(d.posts)) return data
    const posts = d.posts.filter((p) => p.id !== postId)
    return {
      ...d,
      posts,
      tag: d.tag ? { ...d.tag, postCount: posts.length } : d.tag,
    }
  }

  if (
    typeof data === 'object' &&
    data !== null &&
    'pages' in data &&
    Array.isArray((data as { pages: unknown }).pages)
  ) {
    const inf = data as { pages: { items?: { id: string }[]; nextCursor?: unknown; followFallback?: boolean }[]; pageParams: unknown }
    return {
      ...inf,
      pages: inf.pages.map((page) => ({
        ...page,
        items: Array.isArray(page.items) ? page.items.filter((p) => p.id !== postId) : page.items,
      })),
    }
  }

  return data
}
