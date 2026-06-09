import { NextResponse } from 'next/server'
import { ErrorResponse } from './types'

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status })
}

export function errorResponse(message: string, status: number = 400) {
  const response: ErrorResponse = { error: message }
  return NextResponse.json(response, { status })
}

export function internalErrorResponse(error: unknown, logContext: string = '') {
  console.error(`[API Error ${logContext}]:`, error)
  return errorResponse('Internal Server Error', 500)
}

export function unauthorizedResponse() {
  return errorResponse('Unauthorized', 401)
}

export function forbiddenResponse() {
  return errorResponse('Forbidden', 403)
}

export function notFoundResponse() {
  return errorResponse('Not Found', 404)
}

export function conflictResponse(message: string = 'Resource already exists') {
  return errorResponse(message, 409)
}
