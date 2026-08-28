'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, BarChart3, ClipboardList, Download, HelpCircle,
  LayoutGrid, Loader2, Map, Upload, GraduationCap,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import SkillsHeatmap from '@/components/charts/SkillsHeatmap'
import SkillOverview from '@/components/skills/SkillOverview'
import AssessmentGrid from '@/components/skills/AssessmentGrid'
import GapAnalysis from '@/components/skills/GapAnalysis'
import DevelopmentPlan from '@/components/skills/DevelopmentPlan'
import CatalogEditor from '@/components/skills/CatalogEditor'
import ScoringGuide from '@/components/skills/ScoringGuide'
import ImportPreviewModal from '@/components/skills/ImportPreviewModal'
import { useEmployees } from '@/lib/employee-store'
import { useSkillCatalog } from '@/lib/skill-catalog-store'
import {
  buildWorkbook, downloadWorkbook, readWorkbook, previewToEdits,
} from '@/lib/skill-workbook'
import type { ImportPreview } from '@/lib/skill-workbook'
import type { DevelopmentPlanItem } from '@/lib/types'
import { cn } from '@/lib/utils'

type View = 'overview' | 'heatmap' | 'assessment' | 'gaps' | 'development' | 'framework'

const VIEWS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'heatmap', label: 'Heat Map', icon: Map },
  { id: 'assessment', label: 'Assessment', icon: ClipboardList },
  { id: 'gaps', label: 'Gaps & Risk', icon: AlertTriangle },
  { id: 'development', label: 'Development', icon: GraduationCap },
  { id: 'framework', label: 'Framework', icon: BarChart3 },
] as const

const VIEW_IDS = VIEWS.map(v => v.id) as readonly string[]

function isView(value: string | null): value is View {
  return !!value && VIEW_IDS.includes(value)
}

export default function SkillsPage() {
  const {
    employees, updateEmployee, applyAssessments, setDevelopmentPlan,
  } = useEmployees()
  const {
    catalog, domains, roleProfiles,
    addSkill, updateSkill, deleteSkill, replaceCatalog,
    addRoleProfile, updateRoleProfile, deleteRoleProfile,
    thresholds, updateThresholds,
    resetToPreset,
  } = useSkillCatalog()

  const [view, setViewState] = useState<View>('overview')
  const [guideOpen, setGuideOpen] = useState(false)

  // Tabs are deep-linkable (?view=gaps), so a specific view can be shared,
  // bookmarked, or linked to from the user guide.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requested = params.get('view')
    if (isView(requested)) setViewState(requested)
    if (params.get('guide') === '1') setGuideOpen(true)
  }, [])

  const setView = (next: View) => {
    setViewState(next)
    const params = new URLSearchParams(window.location.search)
    params.set('view', next)
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
  }
  const [selectedEmployee, setSelectedEmployee] = useState(employees[0]?.id ?? '')

  const [domainFilter, setDomainFilter] = useState<string>('All')
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [belowTargetOnly, setBelowTargetOnly] = useState(false)

  const [busy, setBusy] = useState<'export' | 'import' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ filename: string; data: ImportPreview } | null>(null)
  const [applyCatalog, setApplyCatalog] = useState(true)
  const fileInput = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setBusy('export')
    setError(null)
    try {
      const blob = await buildWorkbook(employees, catalog, roleProfiles, thresholds)
      const stamp = new Date().toISOString().slice(0, 10)
      downloadWorkbook(blob, `Team_Skills_Assessment_Matrix_${stamp}.xlsx`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.')
    } finally {
      setBusy(null)
    }
  }

  const handleFile = async (file: File) => {
    setBusy('import')
    setError(null)
    try {
      const data = await readWorkbook(file, employees, catalog)
      setApplyCatalog(true)
      setPreview({ filename: file.name, data })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that workbook.')
    } finally {
      setBusy(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const applyImport = () => {
    if (!preview) return
    applyAssessments(previewToEdits(preview.data))

    if (applyCatalog && preview.data.catalogChanges.length > 0) {
      const next = catalog.map(s => {
        const mine = preview.data.catalogChanges.filter(c => c.skillId === s.id)
        if (mine.length === 0) return s
        const updated = { ...s }
        for (const c of mine) {
          if (c.field === 'critical') updated.critical = c.to === 'Yes'
          if (c.field === 'target') updated.targetLevel = Number(c.to) as typeof s.targetLevel
          if (c.field === 'weight') updated.weight = Number(c.to)
        }
        return updated
      })
      replaceCatalog(next)
    }

    setPreview(null)
  }

  const planGap = (employeeId: string, skillId: string) => {
    const emp = employees.find(e => e.id === employeeId)
    const def = catalog.find(s => s.id === skillId)
    if (!emp || !def) return

    const existing = emp.developmentPlan ?? []
    if (existing.some(i => i.skillId === skillId)) {
      setView('development')
      return
    }

    const item: DevelopmentPlanItem = {
      id: `dev-${employeeId}-${skillId}-${Date.now()}`,
      employeeId,
      skillId,
      objective: `Reach level ${def.targetLevel} — ${def.observableCapability}`,
      experienceAssignment: '',
      coach: '',
      course: '',
      dueDate: new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10),
      successEvidence: def.exampleEvidence,
      status: 'Planned',
      createdAt: new Date().toISOString(),
    }
    setDevelopmentPlan(employeeId, [...existing, item])
    setView('development')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Skills Matrix"
        subtitle="Evidence-based technical assessment against the automation skill catalog"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setGuideOpen(true)}
              icon={<HelpCircle className="w-3.5 h-3.5" />}
            >
              Scoring guide
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInput.current?.click()}
              loading={busy === 'import'}
              icon={<Upload className="w-3.5 h-3.5" />}
            >
              Import
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleExport}
              loading={busy === 'export'}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Export
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-xs text-red-700 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-xs text-red-600 font-medium">
              Dismiss
            </button>
          </div>
        )}

        <Card padding="sm" className="flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {VIEWS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  view === id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {view === 'heatmap' && (
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={domainFilter}
                onChange={e => setDomainFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="All">All domains</option>
                {domains.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={criticalOnly}
                  onChange={e => setCriticalOnly(e.target.checked)}
                  className="w-3.5 h-3.5 accent-brand-600"
                />
                Critical only
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={belowTargetOnly}
                  onChange={e => setBelowTargetOnly(e.target.checked)}
                  className="w-3.5 h-3.5 accent-brand-600"
                />
                Below target only
              </label>
            </div>
          )}
        </Card>

        {view === 'overview' && (
          <SkillOverview
            employees={employees}
            catalog={catalog}
            roleProfiles={roleProfiles}
            thresholds={thresholds}
            onSelectEmployee={id => { setSelectedEmployee(id); setView('assessment') }}
          />
        )}

        {view === 'heatmap' && (
          <Card padding="lg">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-800">Team skills coverage</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cells show the final rating; an amber dot marks a rating below that skill&apos;s
                target. Hover any cell for detail.
              </p>
            </div>
            <SkillsHeatmap
              employees={employees}
              catalog={catalog}
              grouped
              filterDomain={domainFilter !== 'All' ? domainFilter : undefined}
              criticalOnly={criticalOnly}
              belowTargetOnly={belowTargetOnly}
            />
          </Card>
        )}

        {view === 'assessment' && (
          <AssessmentGrid
            employees={employees}
            catalog={catalog}
            roleProfiles={roleProfiles}
            thresholds={thresholds}
            selectedId={selectedEmployee}
            onSelect={setSelectedEmployee}
            onSave={applyAssessments}
            onOpenGuide={() => setGuideOpen(true)}
          />
        )}

        {view === 'gaps' && (
          <GapAnalysis
            employees={employees}
            catalog={catalog}
            thresholds={thresholds}
            onPlanGap={planGap}
          />
        )}

        {view === 'development' && (
          <DevelopmentPlan
            employees={employees}
            catalog={catalog}
            onChange={setDevelopmentPlan}
          />
        )}

        {view === 'framework' && (
          <CatalogEditor
            employees={employees}
            catalog={catalog}
            domains={domains}
            roleProfiles={roleProfiles}
            thresholds={thresholds}
            onUpdateThresholds={updateThresholds}
            onAddSkill={addSkill}
            onUpdateSkill={updateSkill}
            onDeleteSkill={deleteSkill}
            onAddRoleProfile={addRoleProfile}
            onUpdateRoleProfile={updateRoleProfile}
            onDeleteRoleProfile={deleteRoleProfile}
            onResetPreset={resetToPreset}
            onAssignRole={(id, roleProfileId) =>
              updateEmployee(id, { roleProfileId: roleProfileId || undefined })
            }
          />
        )}
      </div>

      <ScoringGuide open={guideOpen} onClose={() => setGuideOpen(false)} />

      {preview && (
        <ImportPreviewModal
          filename={preview.filename}
          preview={preview.data}
          applyCatalog={applyCatalog}
          onToggleCatalog={setApplyCatalog}
          onApply={applyImport}
          onCancel={() => setPreview(null)}
        />
      )}

      {busy === 'import' && !preview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/20">
          <div className="bg-white rounded-lg px-4 py-3 shadow-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
            <span className="text-sm text-slate-700">Reading workbook…</span>
          </div>
        </div>
      )}
    </div>
  )
}
