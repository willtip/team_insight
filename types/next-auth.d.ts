import type {} from '@auth/core/types'

// next-auth/@auth-core re-export barrels don't merge declarations, so these
// augmentations must target the packages that actually declare the interfaces.
// User.id is already optional on DefaultUser, so Session.user needs no override here.
declare module '@auth/core/types' {
  interface Session {
    apiToken?: string
    role?: string
  }
  interface User {
    apiToken?: string
    role?: string
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    apiToken?: string
    role?: string
    userId?: string
  }
}
