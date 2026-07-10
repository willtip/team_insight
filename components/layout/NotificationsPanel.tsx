'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Bell, AlertTriangle, CheckCircle2, Info, AlertOctagon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { AI_INSIGHTS } from '@/lib/mock-data'

const SEVERITY_STYLES: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  critical: { icon: <AlertOctagon className="w-4 h-4" />, bg: 'bg-red-50', text: 'text-red-600' },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, bg: 'bg-amber-50', text: 'text-amber-600' },
  success: { icon: <CheckCircle2 className="w-4 h-4" />, bg: 'bg-green-50', text: 'text-green-600' },
  info: { icon: <Info className="w-4 h-4" />, bg: 'bg-blue-50', text: 'text-blue-600' },
}

/**
 * Notification bell with a dropdown panel listing recent AI-generated
 * insights/alerts. Click the bell to open/close; click outside to dismiss.
 */
export default function NotificationsPanel() {
  const [open, setOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  const notifications = [...AI_INSIGHTS].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  )
  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAllRead = () => setReadIds(new Set(notifications.map(n => n.id)))

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[28rem] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-40">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No notifications</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {notifications.map(n => {
                const style = SEVERITY_STYLES[n.severity] ?? SEVERITY_STYLES.info
                const isRead = readIds.has(n.id)
                return (
                  <li key={n.id}>
                    <Link
                      href="/insights"
                      onClick={() => {
                        setReadIds(prev => new Set(prev).add(n.id))
                        setOpen(false)
                      }}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors',
                        !isRead && 'bg-brand-50/40'
                      )}
                    >
                      <div className={cn('p-1.5 rounded-lg flex-shrink-0', style.bg, style.text)}>
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-800 truncate">{n.title}</p>
                          {!isRead && <span className="w-1.5 h-1.5 bg-brand-500 rounded-full flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.summary}</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(n.generatedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="px-4 py-2.5 border-t border-slate-100 sticky bottom-0 bg-white">
            <Link href="/insights" onClick={() => setOpen(false)} className="text-xs text-brand-600 hover:underline font-medium">
              View all in AI Insights →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
