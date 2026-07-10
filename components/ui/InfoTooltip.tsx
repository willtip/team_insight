'use client'

import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InfoTooltipProps {
  text: string
  className?: string
}

/**
 * Small "i" info icon that reveals a brief description on hover or tap.
 * Used to explain what a metric/stat card represents.
 */
export default function InfoTooltip({ text, className }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
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

  return (
    <div ref={containerRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="More information"
        className="flex items-center justify-center w-4 h-4 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute z-30 top-full right-0 mt-2 w-56 p-2.5 bg-slate-800 text-white text-[11px] leading-relaxed rounded-lg shadow-lg"
        >
          {text}
          <div className="absolute -top-1 right-2 w-2 h-2 bg-slate-800 rotate-45" />
        </div>
      )}
    </div>
  )
}
