'use client'

import { EmployeeProvider } from '@/lib/employee-store'
import { SkillCatalogProvider } from '@/lib/skill-catalog-store'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SkillCatalogProvider>
      <EmployeeProvider>{children}</EmployeeProvider>
    </SkillCatalogProvider>
  )
}
