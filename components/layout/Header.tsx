'use client'

import { Bell, Search, HelpCircle, ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const [searchValue, setSearchValue] = useState('')

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
      <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
      </button>

      {/* Help */}
      <button className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
        <HelpCircle className="w-5 h-5" />
      </button>

      {/* Q2 badge */}
      <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-200 rounded-lg">
        <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
        <span className="text-xs font-medium text-brand-700">Q2 2026</span>
        <ChevronDown className="w-3 h-3 text-brand-500" />
      </div>
    </header>
  )
}
