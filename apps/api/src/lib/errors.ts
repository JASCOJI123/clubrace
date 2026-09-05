/** Standard API error (spec §46). Thrown anywhere; serialised centrally. */
export class ApiError extends Error {
  statusCode: number
  code: string
  details?: unknown

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }

  static badRequest(msg: string, details?: unknown) {
    return new ApiError(400, 'BAD_REQUEST', msg, details)
  }
  static unauthorized(msg = 'Avtorizatsiya talab qilinadi') {
    return new ApiError(401, 'UNAUTHORIZED', msg)
  }
  static forbidden(msg = 'Ruxsat yo‘q') {
    return new ApiError(403, 'FORBIDDEN', msg)
  }
  static notFound(msg = 'Topilmadi') {
    return new ApiError(404, 'NOT_FOUND', msg)
  }
  static conflict(msg: string) {
    return new ApiError(409, 'CONFLICT', msg)
  }
  static validation(msg: string, details?: unknown) {
    return new ApiError(422, 'VALIDATION_ERROR', msg, details)
  }
  static internal(msg = 'Serverda xatolik yuz berdi') {
    return new ApiError(500, 'INTERNAL_ERROR', msg)
  }
}