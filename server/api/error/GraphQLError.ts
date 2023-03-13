export default class ErrorGrapgQl extends Error {
  constructor(message: string, refreshToken?: undefined) {
    super()
    this.message = message
  }
  static badRequest(message: string) {
    return new ErrorGrapgQl(message)
  }
}
