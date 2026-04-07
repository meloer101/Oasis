'use client'

import { useLayoutShell } from '@/providers/layout-shell-provider'
import { useLocale } from '@/hooks/use-locale'

const PANEL_W = 320

/** Reads as a right-hand info column next to main content (not a chevron). */
function RightDockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="3" y="4" width="11" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="15" y="4" width="6" height="16" rx="2" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export default function RightPanelToggle() {
  const { rightPanelOpen, toggleRightPanel } = useLayoutShell()
  const { t } = useLocale()

  return (
    <button
      type="button"
      onClick={toggleRightPanel}
      aria-expanded={rightPanelOpen}
      aria-label={t('rightPanel.toggleAria')}
      title={rightPanelOpen ? (t('rightPanel.toggleHide') as string) : (t('rightPanel.toggleShow') as string)}
      className={`hidden xl:inline-flex absolute z-40 items-center gap-2 border border-[var(--border-subtle)] bg-[var(--card-bg)] text-text-primary shadow-[0_4px_24px_rgb(0_0_0/0.08)] backdrop-blur-xl transition-[right,box-shadow] duration-300 ease-[var(--ease-out-expo)] hover:shadow-[0_6px_28px_rgb(0_0_0/0.12)] hover:border-[color-mix(in_srgb,var(--text-primary)_12%,var(--border-subtle))] active:scale-[0.98] motion-reduce:transition-none ${
        rightPanelOpen
          ? 'top-3 rounded-l-xl rounded-r-none border-r-0 py-2.5 pl-3 pr-2'
          : 'top-3 rounded-l-xl py-2.5 pl-3 pr-3 ring-1 ring-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]'
      }`}
      style={{ right: rightPanelOpen ? PANEL_W : 0 }}
    >
      <RightDockIcon className="shrink-0 text-text-primary" />
      <span className="text-xs font-semibold tracking-wide tabular-nums">
        {rightPanelOpen ? t('rightPanel.toggleHide') : t('rightPanel.toggleShow')}
      </span>
    </button>
  )
}
