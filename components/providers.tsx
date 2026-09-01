'use client'

import { useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EmployeeProvider } from '@/lib/employee-store'
import { SkillCatalogProvider } from '@/lib/skill-catalog-store'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }))

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <SkillCatalogProvider>
          <EmployeeProvider>{children}</EmployeeProvider>
        </SkillCatalogProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
