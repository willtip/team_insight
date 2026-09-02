'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiUpload, useApiToken } from './api-client'
import type { ProficiencyLevel } from './types'

/**
 * Client for the server-side assessment importer (`/api/v1/skill-imports`).
 *
 * Parsing, matching and diffing all happen on the server so a whole-team file is one
 * transactional write with an audit record, rather than a POST per changed cell.
 */

export type ImportRowStatus =
  | 'ok'
  | 'unchanged'
  | 'empty'
  | 'duplicate'
  | 'unknown_employee'
  | 'ambiguous_employee'
  | 'unknown_skill'
  | 'invalid_value'
  | 'forbidden_field'

/** Fields the importer can write. Final, Gap and Priority are always derived. */
export interface ImportValues {
  targetOverride?: ProficiencyLevel | null
  selfRating?: ProficiencyLevel | null
  reviewerRating?: ProficiencyLevel | null
  evidence?: string | null
  evidenceUrl?: string | null
}

export interface ImportRow {
  rowNumber: number
  status: ImportRowStatus
  employeeId?: string | null
  employeeName?: string | null
  skillId?: string | null
  skillName?: string | null
  /** Which key resolved the person: "email" | "employee_id" | "name". */
  matchedBy?: string | null
  values: ImportValues
  before: ImportValues
  messages: string[]
  assessedAt?: string | null
}

export interface ImportCounts {
  rowsRead: number
  ok: number
  unchanged: number
  empty: number
  duplicate: number
  unknownEmployee: number
  ambiguousEmployee: number
  unknownSkill: number
  invalidValue: number
  forbiddenField: number
}

export interface ImportBatch {
  id: string
  filename?: string | null
  source: 'xlsx' | 'csv' | 'form'
  status: 'pending' | 'applied' | 'discarded'
  uploadedBy: string
  uploadedAt?: string | null
  appliedAt?: string | null
  rowsRead: number
  rowsApplied: number
  counts: ImportCounts
  warnings: string[]
  rows: ImportRow[]
}

export interface ImportCommitResult {
  batchId: string
  applied: number
  skippedUnchanged: number
  statements: number
}

export interface SelfAssessmentItem {
  skillId: string
  selfRating?: ProficiencyLevel
  evidence?: string
}

const BASE = '/api/v1/skill-imports'
const BATCHES_KEY = ['skill-imports'] as const

/** The only rows a commit will write. */
export const WRITABLE_STATUSES: ImportRowStatus[] = ['ok']

/** Rows the reviewer needs to look at before applying. */
export const PROBLEM_STATUSES: ImportRowStatus[] = [
  'unknown_employee',
  'ambiguous_employee',
  'unknown_skill',
  'invalid_value',
  'forbidden_field',
  'duplicate',
]

export const STATUS_LABEL: Record<ImportRowStatus, string> = {
  ok: 'Will apply',
  unchanged: 'No change',
  empty: 'No values',
  duplicate: 'Superseded',
  unknown_employee: 'No match',
  ambiguous_employee: 'Ambiguous',
  unknown_skill: 'Unknown skill',
  invalid_value: 'Invalid',
  forbidden_field: 'Not permitted',
}

export const MATCHED_BY_LABEL: Record<string, string> = {
  email: 'email',
  employee_id: 'ID',
  name: 'name',
}

export function useImportBatches() {
  const token = useApiToken()
  return useQuery({
    queryKey: BATCHES_KEY,
    queryFn: () => apiFetch<Omit<ImportBatch, 'rows'>[]>(`${BASE}`, { token }),
    enabled: !!token,
  })
}

export function useUploadImport() {
  const token = useApiToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => apiUpload<ImportBatch>(BASE, file, { token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BATCHES_KEY }),
  })
}

export function useCommitImport() {
  const token = useApiToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (batchId: string) =>
      apiFetch<ImportCommitResult>(`${BASE}/${batchId}/commit`, { method: 'POST', token }),
    onSuccess: () => {
      // The grid reads from the employees query, so it has to be refetched for the
      // imported ratings to show up.
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: BATCHES_KEY })
    },
  })
}

export function useDiscardImport() {
  const token = useApiToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (batchId: string) => apiFetch<void>(`${BASE}/${batchId}`, { method: 'DELETE', token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BATCHES_KEY }),
  })
}

export function useSubmitSelfAssessment() {
  const token = useApiToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { items: SelfAssessmentItem[]; employeeId?: string }) =>
      apiFetch<ImportCommitResult>(`${BASE}/self-assessment`, {
        method: 'POST',
        token,
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: BATCHES_KEY })
    },
  })
}
