'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { EMPLOYEES } from './mock-data'
import type { Employee } from './types'

const STORAGE_KEY = 'asi-employees'

interface EmployeeStore {
  employees: Employee[]
  addEmployee: (data: Omit<Employee, 'id'>) => string
  updateEmployee: (id: string, updates: Partial<Employee>) => void
  deleteEmployee: (id: string) => void
}

const EmployeeContext = createContext<EmployeeStore | null>(null)

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(EMPLOYEES)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setEmployees(JSON.parse(stored))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(employees)) } catch {}
  }, [employees, hydrated])

  const addEmployee = useCallback((data: Omit<Employee, 'id'>): string => {
    const id = `emp-${Date.now()}`
    setEmployees(prev => [...prev, { ...data, id }])
    return id
  }, [])

  const updateEmployee = useCallback((id: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
  }, [])

  const deleteEmployee = useCallback((id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id))
  }, [])

  return (
    <EmployeeContext.Provider value={{ employees, addEmployee, updateEmployee, deleteEmployee }}>
      {children}
    </EmployeeContext.Provider>
  )
}

export function useEmployees() {
  const ctx = useContext(EmployeeContext)
  if (!ctx) throw new Error('useEmployees must be used within EmployeeProvider')
  return ctx
}
