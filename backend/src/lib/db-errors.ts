/**
 * PostgreSQL / postgres.js unique violation handling.
 * See https://www.postgresql.org/docs/current/errcodes-appendix.html — 23505 unique_violation
 */

export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  )
}

export function extractConflictField(err: unknown): 'email' | 'username' | null {
  if (typeof err !== 'object' || err === null) return null

  const constraint =
    'constraint_name' in err && typeof (err as { constraint_name: unknown }).constraint_name === 'string'
      ? (err as { constraint_name: string }).constraint_name
      : null

  if (constraint) {
    const lower = constraint.toLowerCase()
    if (lower.includes('email')) return 'email'
    if (lower.includes('username')) return 'username'
  }

  const detail =
    'detail' in err && typeof (err as { detail: unknown }).detail === 'string'
      ? (err as { detail: string }).detail
      : null

  if (detail) {
    const lower = detail.toLowerCase()
    if (lower.includes('(email)')) return 'email'
    if (lower.includes('(username)')) return 'username'
  }

  return null
}
