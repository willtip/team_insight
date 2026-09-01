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
