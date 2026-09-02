'use client'

import { useSession } from 'next-auth/react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function toCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

function toSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

function transformKeys(value: unknown, transform: (key: string) => string): unknown {
  if (Array.isArray(value)) return value.map((v) => transformKeys(v, transform))
  if (value !== null && typeof value === 'object' && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        transform(k),
        transformKeys(v, transform),
      ])
    )
  }
  return value
}

/** Recursively converts snake_case object keys (as returned by the API) to camelCase. */
export function toCamelCase<T>(value: unknown): T {
  return transformKeys(value, toCamelKey) as T
}

/** Recursively converts camelCase object keys (frontend shape) to snake_case for the API. */
export function toSnakeCase(value: unknown): unknown {
  return transformKeys(value, toSnakeKey)
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  token?: string
  body?: unknown
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, body, headers, ...rest } = options
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(toSnakeCase(body)) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ApiError(res.status, text || res.statusText)
  }
  if (res.status === 204) return undefined as T
  const data = await res.json()
  return toCamelCase<T>(data)
}

/** Client-component hook returning the current platform API bearer token, if signed in. */
export function useApiToken(): string | undefined {
  const { data: session } = useSession()
  return session?.apiToken
}

interface ApiUploadOptions {
  token?: string
  /** Extra multipart fields sent alongside the file. */
  fields?: Record<string, string>
}

/**
 * POSTs a file as multipart/form-data.
 *
 * Separate from `apiFetch` because that one hardcodes a JSON content type and
 * `JSON.stringify`s its body. Here the Content-Type header must be omitted entirely
 * so the browser can set it *with* the multipart boundary.
 */
export async function apiUpload<T>(
  path: string,
  file: File,
  options: ApiUploadOptions = {},
): Promise<T> {
  const { token, fields } = options
  const body = new FormData()
  body.append('file', file)
  for (const [key, value] of Object.entries(fields ?? {})) body.append(key, value)

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ApiError(res.status, detailFrom(text) || res.statusText)
  }
  return toCamelCase<T>(await res.json())
}

/** FastAPI wraps errors as `{"detail": "..."}`; surface that rather than raw JSON. */
function detailFrom(text: string): string {
  try {
    const parsed = JSON.parse(text) as { detail?: unknown }
    if (typeof parsed.detail === 'string') return parsed.detail
    if (Array.isArray(parsed.detail)) {
      return parsed.detail
        .map(d => (typeof d === 'object' && d && 'msg' in d ? String((d as { msg: unknown }).msg) : String(d)))
        .join('; ')
    }
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return text
}
