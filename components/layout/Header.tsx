'use client'

import { Search, BookOpen } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NotificationsPanel from './NotificationsPanel'
import QuarterSelector from './QuarterSelector'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const [searchValue, setSearchValue] = useState('')
  const pathname = usePathname()
  const onGuide = pathname === '/guide'

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      {/* Search */}
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search team, goals, projects..."
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          className="w-72 pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-slate-400"
        />
      </div>

      {/* Actions */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}

      {/* Notification bell */}
      <NotificationsPanel />

      {/* User guide */}
      <Link
        href="/guide"
        title="Open the user guide"
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
          onGuide
            ? 'bg-brand-50 text-brand-700'
            : 'text-slate-500 hover:text-brand-700 hover:bg-brand-50',
        )}
      >
        <BookOpen className="w-4 h-4" />
        <span className="hidden lg:inline">Guide</span>
      </Link>

      {/* Quarter selector */}
      <QuarterSelector defaultValue="Q2 2026" />
    </header>
  )
}
