'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  Target,
  Zap,
  Map,
  MessageSquare,
  FileText,
  Settings,
  BrainCircuit,
  ChevronRight,
  LogOut,
  Shield,
  User,
} from 'lucide-react'
import { cn, initials, avatarColor, nameFromEmail } from '@/lib/utils'
import { CURRENT_USER } from '@/lib/mock-data'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employees', label: 'Team', icon: Users },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/skills', label: 'Skills Matrix', icon: Map },
  { href: '/projects', label: 'Projects', icon: Zap },
  { href: '/insights', label: 'AI Insights', icon: BrainCircuit, badge: '5' },
  { href: '/notes', label: 'Director Notes', icon: MessageSquare, badge: '2' },
  { href: '/reports', label: 'Reports', icon: FileText },
]

const BOTTOM_ITEMS = [
  { href: '/admin', label: 'Admin', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()

  // CURRENT_USER is demo scaffolding whose fields are blank, so the signed-in
  // session is the real source for the profile card. Without this the avatar
  // renders as an empty coloured circle.
  const name =
    session?.user?.name?.trim() ||
    nameFromEmail(session?.user?.email) ||
    CURRENT_USER.name ||
    'Team member'
  const title = CURRENT_USER.title || session?.user?.email || ''

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Team Insight</p>
            <p className="text-slate-400 text-xs">AI Performance Platform</p>
          </div>
        </div>
      </div>

      {/* Director badge */}
      <div className="px-4 py-3 mx-4 mt-4 mb-1 rounded-lg bg-brand-900/40 border border-brand-800/50">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-brand-300 text-xs font-medium">Director View</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300')} />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className={cn(
                  'text-xs rounded-full px-1.5 py-0.5 font-semibold min-w-[20px] text-center',
                  isActive ? 'bg-white/20 text-white' : 'bg-brand-600/20 text-brand-400'
                )}>
                  {badge}
                </span>
              )}
              {isActive && <ChevronRight className="w-3 h-3 text-white/60" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-3 space-y-0.5 border-t border-slate-700/50 pt-2">
        {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}

        {/* User profile and sign out, hidden until the session resolves so the
            sign-in page doesn't render a placeholder identity. */}
        {status === 'authenticated' && (
          <>
            <div className="mt-2 px-3 py-2.5 rounded-lg bg-slate-800/50 flex items-center gap-3">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0', avatarColor(name))}>
                {initials(name) || <User className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{name}</p>
                {title && <p className="text-slate-400 text-xs truncate">{title}</p>}
              </div>
            </div>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/sign-in' })}
              className="mt-1 flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 transition-all hover:text-white hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
