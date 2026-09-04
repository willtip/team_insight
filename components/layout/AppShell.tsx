'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import QuarterlyReminderBanner from '@/components/layout/QuarterlyReminderBanner'

/** The sign-in page renders its own centered layout — showing the app sidebar
 * there exposes nav to protected pages, a stale "Director View" badge, and an
 * empty bottom-left profile card for a session that doesn't exist yet. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSignIn = pathname?.startsWith('/sign-in')

  if (isSignIn) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="main-content flex-1 flex flex-col">
        <QuarterlyReminderBanner />
        {children}
      </main>
    </div>
  )
}
