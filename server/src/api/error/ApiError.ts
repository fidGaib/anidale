class ApiError extends Error {
  constructor(public status: number, public message: string) {
    super()
  }
  static badRequest(message: string) {
    return new ApiError(404, message)
  }
  static internal(message: string) {
    return new ApiError(500, message)
  }
  static forbidden(message: string) {
    return new ApiError(403, message)
  }
  static UnathorizedError() {
    return new ApiError(401, 'НЕ АВТОРИЗОВАН.')
  }
}
export default ApiError
