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
