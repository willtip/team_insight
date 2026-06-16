import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import Providers from '@/components/providers'
import QuarterlyReminderBanner from '@/components/layout/QuarterlyReminderBanner'

export const metadata: Metadata = {
  title: 'Team Insight AI | Performance Management Platform',
  description: 'Enterprise-grade team performance management, coaching, and development platform powered by AI.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="main-content flex-1 flex flex-col">
              <QuarterlyReminderBanner />
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
