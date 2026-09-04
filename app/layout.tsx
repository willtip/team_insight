import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/providers'
import AppShell from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'Team Insight AI | Performance Management Platform',
  description: 'Enterprise-grade team performance management, coaching, and development platform powered by AI.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
