'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, X } from 'lucide-react'

const STORAGE_KEY = 'quarterly-reminder-date'

export default function QuarterlyReminderBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        setVisible(true)
      } else {
        setVisible(new Date() >= new Date(stored))
      }
    } catch {
      setVisible(true)
    }
  }, [])

  const dismiss = () => {
    const next = new Date()
    next.setDate(next.getDate() + 90)
    try { localStorage.setItem(STORAGE_KEY, next.toISOString()) } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-3">
      <Bell className="w-4 h-4 text-amber-600 flex-shrink-0" />
      <p className="text-sm text-amber-800 flex-1">
        <span className="font-semibold">Quarterly reminder:</span> Time to update your team&apos;s profiles with coaching notes and accomplishments.
      </p>
      <Link href="/employees" className="text-xs font-semibold text-amber-700 hover:underline flex-shrink-0">
        Go to Team →
      </Link>
      <button onClick={dismiss} className="p-1 rounded hover:bg-amber-100 text-amber-500 flex-shrink-0" title="Dismiss for 90 days">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
