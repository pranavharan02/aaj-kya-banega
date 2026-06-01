'use client'

import { useEffect, useState } from 'react'

interface ToastMessage {
  id: number
  text: string
  type: 'success' | 'error' | 'info'
}

let toastId = 0
let addToastFn: ((msg: Omit<ToastMessage, 'id'>) => void) | null = null

export function toast(text: string, type: 'success' | 'error' | 'info' = 'success') {
  addToastFn?.({ text, type })
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    addToastFn = (msg) => {
      const id = ++toastId
      setToasts(prev => [...prev, { ...msg, id }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
    }
    return () => { addToastFn = null }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`px-5 py-3 rounded-xl text-sm font-medium shadow-lg animate-[fadeInUp_0.2s_ease-out] ${
            t.type === 'success' ? 'bg-[#1A1A1A] text-white' :
            t.type === 'error' ? 'bg-[#C62828] text-white' :
            'bg-white text-[#1A1A1A] border border-[#E0E0E0]'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}
