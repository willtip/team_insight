'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const QUARTERS = ['Q4 2026', 'Q3 2026', 'Q2 2026', 'Q1 2026', 'Q4 2025', 'Q3 2025', 'Q2 2025', 'Q1 2025']

interface QuarterSelectorProps {
  defaultValue?: string
  onChange?: (quarter: string) => void
}

/**
 * Clickable "Q2 2026"-style badge that opens a dropdown to pick a
 * different reporting quarter.
 */
export default function QuarterSelector({ defaultValue = 'Q2 2026', onChange }: QuarterSelectorProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(defaultValue)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (quarter: string) => {
    setSelected(quarter)
    onChange?.(quarter)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors"
      >
        <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
        <span className="text-xs font-medium text-brand-700">{selected}</span>
        <ChevronDown className={cn('w-3 h-3 text-brand-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-xl z-40 py-1"
        >
          {QUARTERS.map(q => (
            <button
              key={q}
              type="button"
              role="option"
              aria-selected={q === selected}
              onClick={() => handleSelect(q)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors',
                q === selected ? 'text-brand-700 font-medium' : 'text-slate-600'
              )}
            >
              {q}
              {q === selected && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
