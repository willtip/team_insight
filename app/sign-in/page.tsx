'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Button from '@/components/ui/Button'

function SignInForm() {
  const [email, setEmail] = useState('')
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'
  const isDev = process.env.NODE_ENV !== 'production'

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Team Insight AI</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
        </div>

        <Button className="w-full" onClick={() => signIn('microsoft-entra-id', { callbackUrl })}>
          Sign in with Microsoft
        </Button>

        {isDev && (
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Local development only
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => signIn('dev-login', { email, callbackUrl })}
            >
              Continue as dev user
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
