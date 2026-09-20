export interface APIResponse<T = any> {
  statusCode: number
  headers: Record<string, string>
  body: string
}

export const successResponse = <T>(data: T, statusCode = 200): APIResponse => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
})

export const errorResponse = (error: any, statusCode = 500): APIResponse => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    error: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  }),
})
