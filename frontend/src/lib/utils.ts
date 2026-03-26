export function timeAgo(date: string | Date): string {
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  return d.toLocaleDateString()
}

export function heatBadge(temperature: string): { emoji: string; color: string } | null {
  const t = parseFloat(temperature)
  if (t > 100) return { emoji: '🔥', color: 'text-red-400' }
  if (t > 20) return { emoji: '⚡', color: 'text-amber-400' }
  if (t > 5) return { emoji: '↑', color: 'text-emerald-400' }
  return null
}

export function formatCoins(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
