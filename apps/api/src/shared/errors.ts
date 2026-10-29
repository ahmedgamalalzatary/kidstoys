/** An error with an HTTP status and optional per-field validation messages. */
export class ApiError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }

  static badRequest(message: string, fields?: Record<string, string>): ApiError {
    return new ApiError(400, message, fields);
  }

  static unauthorized(message = "You need to sign in to continue"): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = "You do not have access to this"): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = "Not found"): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message);
  }
}
