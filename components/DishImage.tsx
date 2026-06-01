'use client'

import { useState } from 'react'

const CUISINE_BG: Record<string, string> = {
  tamil: '#E8D5C4',
  north: '#F5E6CC',
  marathi: '#D4E8D4',
  bihari: '#E8DCC8',
  custom: '#F5F5F5',
}

export function DishImage({
  name,
  cuisine,
  className = '',
}: {
  name: string
  cuisine: string
  className?: string
}) {
  const bg = CUISINE_BG[cuisine] || '#F5F5F5'
  const initial = name.charAt(0).toUpperCase()

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ backgroundColor: bg }}
    >
      <span className="text-3xl font-bold opacity-30">{initial}</span>
    </div>
  )
}
