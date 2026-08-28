'use client'

import { useState } from 'react'
import { AlertTriangle, Info, Lightbulb, Maximize2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Screenshot with a caption. Click to view the full-resolution capture. */
export function Figure({
  src, alt, caption,
}: { src: string; alt: string; caption?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <figure className="my-5">
      <button
        onClick={() => setOpen(true)}
        className="group relative block w-full rounded-xl border border-slate-200 overflow-hidden bg-slate-50 hover:border-brand-300 transition-colors"
        aria-label={`Enlarge: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full block" loading="lazy" />
        <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900/70 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 className="w-3 h-3" /> Enlarge
        </span>
      </button>
      {caption && (
        <figcaption className="text-xs text-slate-500 mt-2 leading-relaxed">{caption}</figcaption>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 p-6 overflow-auto"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="fixed top-4 right-4 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-w-full mx-auto rounded-lg shadow-2xl" />
        </div>
      )}
    </figure>
  )
}

const CALLOUT = {
  tip: { icon: Lightbulb, cls: 'bg-brand-50 border-brand-200 text-brand-900', iconCls: 'text-brand-600' },
  note: { icon: Info, cls: 'bg-slate-50 border-slate-200 text-slate-700', iconCls: 'text-slate-400' },
  warn: { icon: AlertTriangle, cls: 'bg-amber-50 border-amber-200 text-amber-900', iconCls: 'text-amber-600' },
}

export function Callout({
  kind = 'note', title, children,
}: { kind?: keyof typeof CALLOUT; title?: string; children: React.ReactNode }) {
  const { icon: Icon, cls, iconCls } = CALLOUT[kind]
  return (
    <div className={cn('flex gap-3 p-3.5 rounded-xl border my-4 text-sm leading-relaxed', cls)}>
      <Icon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', iconCls)} />
      <div className="min-w-0">
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  )
}

/** Numbered walkthrough. */
export function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="my-4 space-y-3 counter-reset">{children}</ol>
}

export function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        {children && <div className="text-sm text-slate-600 mt-1 leading-relaxed space-y-2">{children}</div>}
      </div>
    </li>
  )
}

export function Section({
  id, title, lead, children,
}: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 pt-10 first:pt-0">
      <h2 className="text-xl font-semibold text-slate-900 mb-1">{title}</h2>
      {lead && <p className="text-sm text-slate-500 mb-4 max-w-3xl leading-relaxed">{lead}</p>}
      <div className="max-w-4xl">{children}</div>
    </section>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-700 leading-relaxed my-3">{children}</p>
}

export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[12px] font-mono">
      {children}
    </code>
  )
}

export function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="my-3 p-3.5 rounded-xl bg-slate-900 text-slate-100 text-[12px] font-mono overflow-x-auto leading-relaxed">
      {children}
    </pre>
  )
}

export function Table({
  head, rows,
}: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50">
            {head.map(h => (
              <th key={h} className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 text-slate-700 align-top">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
