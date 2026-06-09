import {
  successResponse,
  errorResponse,
  internalErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
} from '../api-utils'

describe('API Response Utilities', () => {
  describe('successResponse', () => {
    it('should return a 200 response by default', () => {
      const response = successResponse({ id: '123', name: 'Test' })
      expect(response.status).toBe(200)
    })

    it('should return a custom status code', () => {
      const response = successResponse({ id: '123' }, 201)
      expect(response.status).toBe(201)
    })

    it('should include data in response body', async () => {
      const data = { id: '123', name: 'Test' }
      const response = successResponse(data)
      const json = await response.json()
      expect(json).toEqual(data)
    })
  })

  describe('errorResponse', () => {
    it('should return a 400 response by default', () => {
      const response = errorResponse('Bad Request')
      expect(response.status).toBe(400)
    })

    it('should return a custom status code', () => {
      const response = errorResponse('Server Error', 500)
      expect(response.status).toBe(500)
    })

    it('should include error message in response body', async () => {
      const message = 'Invalid input'
      const response = errorResponse(message)
      const json = await response.json()
      expect(json).toEqual({ error: message })
    })
  })

  describe('internalErrorResponse', () => {
    it('should return a 500 response', () => {
      const response = internalErrorResponse(new Error('Database error'))
      expect(response.status).toBe(500)
    })

    it('should return generic error message', async () => {
      const response = internalErrorResponse(new Error('Database error'))
      const json = await response.json()
      expect(json).toEqual({ error: 'Internal Server Error' })
    })

    it('should accept log context parameter', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const error = new Error('Database error')
      internalErrorResponse(error, 'POST /api/games')
      expect(consoleSpy).toHaveBeenCalledWith('[API Error POST /api/games]:', error)
      consoleSpy.mockRestore()
    })
  })

  describe('unauthorizedResponse', () => {
    it('should return a 401 response', () => {
      const response = unauthorizedResponse()
      expect(response.status).toBe(401)
    })

    it('should include Unauthorized message', async () => {
      const response = unauthorizedResponse()
      const json = await response.json()
      expect(json).toEqual({ error: 'Unauthorized' })
    })
  })

  describe('forbiddenResponse', () => {
    it('should return a 403 response', () => {
      const response = forbiddenResponse()
      expect(response.status).toBe(403)
    })

    it('should include Forbidden message', async () => {
      const response = forbiddenResponse()
      const json = await response.json()
      expect(json).toEqual({ error: 'Forbidden' })
    })
  })

  describe('notFoundResponse', () => {
    it('should return a 404 response', () => {
      const response = notFoundResponse()
      expect(response.status).toBe(404)
    })

    it('should include Not Found message', async () => {
      const response = notFoundResponse()
      const json = await response.json()
      expect(json).toEqual({ error: 'Not Found' })
    })
  })

  describe('conflictResponse', () => {
    it('should return a 409 response', () => {
      const response = conflictResponse()
      expect(response.status).toBe(409)
    })

    it('should include default conflict message', async () => {
      const response = conflictResponse()
      const json = await response.json()
      expect(json).toEqual({ error: 'Resource already exists' })
    })

    it('should accept custom message', async () => {
      const message = 'Invite code already used'
      const response = conflictResponse(message)
      const json = await response.json()
      expect(json).toEqual({ error: message })
    })
  })
})
