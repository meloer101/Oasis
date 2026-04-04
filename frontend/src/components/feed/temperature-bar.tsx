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

  const numColor = isNegative
    ? 'text-red-400'
    : t >= 500
      ? 'text-amber-500'
      : t >= 100
        ? 'text-brand'
        : 'text-sage'

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
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-border-subtle relative">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: isNegative
              ? 'linear-gradient(90deg, rgb(248 113 113), rgb(251 146 60))'
              : 'linear-gradient(90deg, var(--rose), var(--brand), var(--sage))',
          }}
        />
      </div>
      <span className={`font-mono text-[11px] shrink-0 ${numColor}`}>{display}</span>
    </div>
  )
}
