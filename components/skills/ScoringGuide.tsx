'use client'

import { X, ExternalLink } from 'lucide-react'
import { PROFICIENCY_ANCHORS, CATALOG_SOURCES } from '@/lib/skill-catalog'
import { cn, skillLevelColor } from '@/lib/utils'

interface ScoringGuideProps {
  open: boolean
  onClose: () => void
}

/**
 * The rubric, reachable from every tab. Raters need the anchor text at the
 * moment they rate, not on a separate page.
 */
export default function ScoringGuide({ open, onClose }: ScoringGuideProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-3xl h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-900">Proficiency anchors</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rate on recent demonstrated evidence, not on familiarity or job title.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close scoring guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {PROFICIENCY_ANCHORS.map(a => (
            <div key={a.level} className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
                    skillLevelColor(a.level),
                  )}
                >
                  {a.level}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{a.label}</p>
                  <p className="text-xs text-slate-500">{a.observableBehavior}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">
                  {a.coverageMeaning}
                </span>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-xs">
                {([
                  ['Independence', a.independence],
                  ['Scope', a.scope],
                  ['Evidence', a.evidence],
                ] as const).map(([label, value]) => (
                  <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">
                      {label}
                    </dt>
                    <dd className="text-slate-700">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}

          <div className="pt-3">
            <h3 className="text-xs font-semibold text-slate-700 mb-2">
              How the numbers are used
            </h3>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
              <li><strong>Breadth</strong> counts skills at level 2 or above.</li>
              <li><strong>Coverage</strong> counts people at level 3 or above — working proficiency.</li>
              <li><strong>Depth</strong> counts skills at level 4 or above; a critical skill with one
                  or fewer depth owners is flagged as a bus-factor risk.</li>
              <li>A reviewer rating supersedes the self rating wherever both exist.</li>
              <li>Priority is <strong>High</strong> when a critical skill sits two or more levels
                  below target.</li>
            </ul>
            <p className="text-[11px] text-slate-400 mt-3">
              Use this for capability planning and growth, not forced ranking.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-700 mb-2">Reference sources</h3>
            <ul className="space-y-1.5">
              {CATALOG_SOURCES.map(s => (
                <li key={s.url} className="text-xs">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
                  >
                    {s.name}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-slate-500"> — {s.relevance}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
