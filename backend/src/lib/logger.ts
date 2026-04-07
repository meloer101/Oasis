// Lightweight structured logger. Zero dependencies.
// - Development (NODE_ENV=development): colorized human-readable output
// - Production: JSON Lines for log aggregation (CloudWatch, Datadog, etc.)

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

function minLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL ?? '').toLowerCase()
  if (env in LEVEL_WEIGHT) return env as LogLevel
  return process.env.NODE_ENV === 'development' ? 'debug' : 'info'
}

// ── ANSI colors (dev only) ────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: C.gray,
  info: C.cyan,
  warn: C.yellow,
  error: C.red,
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0')
}

function timestamp(): string {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack }
  }
  return { raw: String(err) }
}

function formatCtx(ctx: Record<string, unknown>): string {
  return Object.entries(ctx)
    .map(([k, v]) => `${C.dim}${k}${C.reset}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(' ')
}

function formatDev(
  level: LogLevel,
  ns: string,
  msg: string,
  ctx?: Record<string, unknown>,
  err?: unknown,
): string {
  const ts = `${C.dim}${timestamp()}${C.reset}`
  const lc = LEVEL_COLOR[level]
  const lv = `${lc}${C.bold}[${level.toUpperCase().padEnd(5)}]${C.reset}`
  const namespace = `${C.magenta}[${ns}]${C.reset}`
  const message = level === 'error' ? `${C.red}${msg}${C.reset}` : msg
  const parts = [ts, lv, namespace, message]
  if (ctx && Object.keys(ctx).length > 0) parts.push(formatCtx(ctx))
  if (err !== undefined) {
    const e = serializeError(err)
    parts.push(`${C.red}${e.name ?? 'Error'}: ${e.message}${C.reset}`)
    if (e.stack) parts.push(`\n${C.dim}${e.stack}${C.reset}`)
  }
  return parts.join('  ')
}

function formatProd(
  level: LogLevel,
  ns: string,
  msg: string,
  ctx?: Record<string, unknown>,
  err?: unknown,
): string {
  const entry: Record<string, unknown> = {
    level,
    ts: new Date().toISOString(),
    ns,
    msg,
    ...ctx,
  }
  if (err !== undefined) {
    entry['error'] = serializeError(err)
  }
  try {
    return JSON.stringify(entry)
  } catch {
    return JSON.stringify({ level, ts: new Date().toISOString(), ns, msg, error: 'log serialization failed' })
  }
}

// ── Logger class ─────────────────────────────────────────────────────────────

class Logger {
  private readonly isDev: boolean
  private readonly min: number

  constructor(private readonly ns: string) {
    this.isDev = process.env.NODE_ENV === 'development'
    this.min = LEVEL_WEIGHT[minLevel()]
  }

  private write(
    level: LogLevel,
    msg: string,
    ctx?: Record<string, unknown>,
    err?: unknown,
  ): void {
    if (LEVEL_WEIGHT[level] < this.min) return
    const line = this.isDev
      ? formatDev(level, this.ns, msg, ctx, err)
      : formatProd(level, this.ns, msg, ctx, err)
    process.stdout.write(line + '\n')
  }

  debug(msg: string, ctx?: Record<string, unknown>): void {
    this.write('debug', msg, ctx)
  }

  info(msg: string, ctx?: Record<string, unknown>): void {
    this.write('info', msg, ctx)
  }

  warn(msg: string, ctx?: Record<string, unknown>): void {
    this.write('warn', msg, ctx)
  }

  /**
   * Two call signatures:
   *   log.error('msg', err)           — Error object or unknown thrown value
   *   log.error('msg', { key: val })  — structured context, no error object
   *   log.error('msg', err, { key })  — error + extra context
   */
  error(msg: string, errOrCtx?: unknown, ctx?: Record<string, unknown>): void {
    if (errOrCtx instanceof Error) {
      this.write('error', msg, ctx, errOrCtx)
    } else if (
      errOrCtx !== null &&
      errOrCtx !== undefined &&
      typeof errOrCtx === 'object' &&
      !Array.isArray(errOrCtx)
    ) {
      this.write('error', msg, errOrCtx as Record<string, unknown>)
    } else if (errOrCtx !== undefined) {
      this.write('error', msg, ctx, errOrCtx)
    } else {
      this.write('error', msg, ctx)
    }
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

export function createLogger(namespace: string): Logger {
  return new Logger(namespace)
}

/** Global default logger (namespace: 'app'). */
export const logger = createLogger('app')
