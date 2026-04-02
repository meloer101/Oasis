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
  const pct = isNegative ? 0 : Math.min((abs / 1000) * 100, 100)

  const barColor = isNegative
    ? ''
    : t >= 1000
    ? 'bg-red-500'
    : t >= 500
    ? 'bg-orange-400'
    : t >= 100
    ? 'bg-amber-400'
    : 'bg-emerald-500'

  const numColor = isNegative
    ? 'text-red-400'
    : t >= 500
    ? 'text-amber-400'
    : 'text-text-muted'

  const display = isNegative
    ? `-${Math.round(abs)}`
    : abs >= 1
    ? Math.round(abs).toString()
    : abs.toFixed(1)

  if (compact) {
    if (t === 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-mono font-medium text-text-muted">
          <span className="opacity-70" aria-hidden>
            🌡
          </span>
          0
        </span>
      )
    }
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-mono font-medium ${numColor}`}>
        <span className="opacity-70" aria-hidden>
          🌡
        </span>
        {display}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1.5 flex-1">
      <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`font-mono text-[11px] ${numColor}`}>{display}</span>
    </div>
  )
}
