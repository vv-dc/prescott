import { STATUS_CODES } from 'http';

export class HttpError extends Error {
  public statusCode: number;
  public error: string;

  constructor(message = 'Internal Server Error', statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.error = STATUS_CODES[statusCode] ?? message;
  }
}

export class HttpConflict extends HttpError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class HttpForbidden extends HttpError {
  constructor(message: string) {
    super(message, 403);
  }
}

export class HttpNotFound extends HttpError {
  constructor(message: string) {
    super(message, 404);
  }
}
export class HttpUnauthorized extends HttpError {
  constructor(message: string) {
    super(message, 403);
  }
}
