import { auth0 } from '@/lib/auth'

export async function GET(request: Request) {
  return await auth0.middleware(request)
}
