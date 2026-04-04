'use client'

interface Props {
  temperature: string
  /** Slim numeric display for card footers */
  compact?: boolean
}

export function TemperatureBar({ temperature, compact }: Props) {
  const t = parseFloat(temperature)
  if (t === 0 && !compact) return null

  const isNegative = t < 0
  const abs = Math.abs(t)
  const pct = isNegative ? Math.min((abs / 500) * 100, 100) : Math.min((abs / 1000) * 100, 100)

  const numColor = isNegative ? 'text-text-secondary' : 'text-text-primary'

  const display = isNegative
    ? `-${Math.round(abs)}`
    : abs >= 1
      ? Math.round(abs).toString()
      : abs.toFixed(1)

  const barFillClass = isNegative
    ? 'bg-gradient-to-r from-black/20 to-black/45 dark:from-white/15 dark:to-white/38'
    : 'bg-gradient-to-r from-black/10 to-black/42 dark:from-white/10 dark:to-white/40'

  if (compact) {
    if (t === 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-mono font-medium text-text-muted">
          <span className="opacity-70" aria-hidden>
            ○
          </span>
          0
        </span>
      )
    }
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-mono font-medium ${numColor}`}>
        <span className="opacity-70 text-text-muted" aria-hidden>
          ○
        </span>
        {display}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-border-subtle relative">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${barFillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`font-mono text-[11px] shrink-0 ${numColor}`}>{display}</span>
    </div>
  )
}
