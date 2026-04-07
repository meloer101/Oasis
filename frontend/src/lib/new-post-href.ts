/** Match `/circle/:uuid` for contextual "new post" links (PostgreSQL uuid text form). */
const CIRCLE_POST_PATH = /^\/circle\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

export function getNewPostHref(pathname: string | null | undefined): string {
  if (!pathname) return '/feed/new'
  const m = pathname.match(CIRCLE_POST_PATH)
  return m ? `/feed/new?circle=${encodeURIComponent(m[1])}` : '/feed/new'
}
