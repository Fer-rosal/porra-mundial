// For server-side auth validation in Route handlers
// This is a placeholder implementation - actual Auth0 session validation should be implemented
// based on Auth0 Next.js SDK v4.22.0 documentation

import { NextRequest } from 'next/server'

interface SessionUser {
  sub: string
  email?: string
  name?: string
  picture?: string
}

export async function getSessionUser(request?: NextRequest): Promise<SessionUser | null> {
  try {
    // Support test mode: if Authorization header is present with "Bearer", treat as authenticated
    // In production, this should validate actual JWT tokens from Auth0
    if (request) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        // In development/test, accept any Bearer token
        // In production, verify the JWT with Auth0
        return {
          sub: `test-user-${token.substring(0, 8)}`,
          email: `test-${token.substring(0, 8)}@example.com`,
          name: 'Test User',
        }
      }
    }
    return null
  } catch (error) {
    return null
  }
}

export async function requireAuth(request?: NextRequest): Promise<SessionUser> {
  const user = await getSessionUser(request)
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}
