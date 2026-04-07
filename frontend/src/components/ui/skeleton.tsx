export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[color-mix(in_srgb,var(--text-primary)_7%,var(--card-bg))] ${className ?? ''}`}
      aria-hidden="true"
    />
  )
}
