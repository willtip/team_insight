'use client'

import { EmployeeProvider } from '@/lib/employee-store'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <EmployeeProvider>{children}</EmployeeProvider>
}
