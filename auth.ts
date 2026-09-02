import NextAuth from 'next-auth'
import type { Provider } from 'next-auth/providers'
import Credentials from 'next-auth/providers/credentials'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface PlatformTokenResponse {
  access_token: string
  role: string
  user_id: string
}

/**
 * Reads `exp` out of a JWT without verifying it — only to decide when to refresh.
 * The backend re-verifies the signature on every call, so a bad value here can at
 * worst cause an unnecessary refresh.
 */
function expiresAt(jwt: string): number | null {
  try {
    const payload = JSON.parse(
      Buffer.from(jwt.split('.')[1], 'base64').toString('utf8'),
    ) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

/** Refresh once the platform token is inside this many seconds of expiring. */
const REFRESH_WINDOW_SECONDS = 300

const providers: Provider[] = [
  MicrosoftEntraID({
    clientId: process.env.AZURE_AD_CLIENT_ID ?? '',
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? '',
    issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID ?? 'common'}/v2.0`,
  }),
]

// Local-dev-only bypass so sign-in doesn't require a real Azure AD app registration.
// The backend rejects this at /auth/dev-login unless ENVIRONMENT=development.
if (process.env.NODE_ENV !== 'production') {
  providers.push(
    Credentials({
      id: 'dev-login',
      name: 'Dev login',
      credentials: { email: { label: 'Email', type: 'email' } },
      async authorize(credentials) {
        const res = await fetch(`${API_BASE}/api/v1/auth/dev-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: credentials?.email }),
        })
        if (!res.ok) return null
        const data = (await res.json()) as PlatformTokenResponse
        return {
          id: data.user_id as string,
          email: credentials?.email as string,
          apiToken: data.access_token as string,
          role: data.role as string,
        }
      },
    })
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: 'jwt' },
  pages: { signIn: '/sign-in' },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account?.provider === 'microsoft-entra-id' && account.access_token) {
        const res = await fetch(`${API_BASE}/api/v1/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ azure_token: account.access_token }),
        })
        if (res.ok) {
          const data = (await res.json()) as PlatformTokenResponse
          token.apiToken = data.access_token
          token.role = data.role
          token.userId = data.user_id
        }
      } else if (user?.apiToken) {
        token.apiToken = user.apiToken
        token.role = user.role
        token.userId = user.id
      } else if (typeof token.apiToken === 'string') {
        // The NextAuth session lasts 30 days but the platform token only 8 hours.
        // Without this the session stays "signed in" while every API call 401s, and
        // the app renders an empty shell rather than asking for a fresh sign-in.
        const exp = expiresAt(token.apiToken)
        if (exp !== null && Date.now() / 1000 > exp - REFRESH_WINDOW_SECONDS) {
          const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: token.apiToken }),
          }).catch(() => null)

          if (res?.ok) {
            const data = (await res.json()) as PlatformTokenResponse
            token.apiToken = data.access_token
            token.role = data.role
            token.userId = data.user_id
          } else if (res && res.status === 401) {
            // Revoked, or the account is gone. Drop the token so middleware sends
            // them back to sign-in instead of showing a blank app.
            delete token.apiToken
          }
          // A network failure leaves the old token in place, so a brief API outage
          // doesn't sign everyone out.
        }
      }
      return token
    },
    async session({ session, token }) {
      session.apiToken = token.apiToken
      session.role = token.role
      if (session.user && token.userId) session.user.id = token.userId
      return session
    },
  },
})
