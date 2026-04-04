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
  if (t > 100) return { emoji: '↑', color: 'text-text-primary' }
  if (t > 20) return { emoji: '↑', color: 'text-text-secondary' }
  if (t > 5) return { emoji: '↑', color: 'text-text-muted' }
  return null
}

/** Short numeric + vibe label for feed sentiment row (i18n labels passed from caller). */
export function sentimentActivityParts(temperature: string): {
  signed: string
  tone: 'hot' | 'active' | 'warm' | 'cool' | 'cold'
} | null {
  const t = parseFloat(temperature)
  if (Number.isNaN(t)) return null
  const rounded = Math.round(t)
  const signed = rounded > 0 ? `+${rounded}` : String(rounded)
  let tone: 'hot' | 'active' | 'warm' | 'cool' | 'cold'
  if (t >= 60) tone = 'hot'
  else if (t >= 20) tone = 'active'
  else if (t > 0) tone = 'warm'
  else if (t > -25) tone = 'cool'
  else tone = 'cold'
  return { signed, tone }
}

export function formatCoins(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function getBadgeEmoji(balance: number): string | null {
  if (balance >= 2000) return '🔥'
  if (balance >= 500) return '⚡'
  if (balance >= 100) return '🌱'
  return null
}

/** Rough reading time for feed cards (mixed CJK / Latin). */
export function estimateReadingMinutes(text: string): number {
  const t = text.trim()
  if (!t) return 1
  const latinWords = t.match(/[a-zA-Z]{2,}/g)?.length ?? 0
  if (latinWords > 20) {
    return Math.max(1, Math.ceil(latinWords / 200))
  }
  return Math.max(1, Math.ceil(t.length / 500))
}

