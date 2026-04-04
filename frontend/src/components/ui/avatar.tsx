'use client'

import { useState } from 'react'

interface AvatarProps {
  src?: string | null
  name: string
  className?: string
  textClassName?: string
}

export function Avatar({ src, name, className = '', textClassName = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const initial = (name || '?').charAt(0).toUpperCase()

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`object-cover ${className}`}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div className={`flex items-center justify-center font-semibold ${className} ${textClassName}`}>
      {initial}
    </div>
  )
}
