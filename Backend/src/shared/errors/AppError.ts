import { ErrorCode, HttpStatus, type ErrorCodeValue, type HttpStatusValue } from './errorCodes.js';

/**
 * Base operational error. "Operational" = an expected failure we throw on
 * purpose (bad input, missing resource, auth failure). The error middleware
 * treats these as safe to surface to the client. Anything that is NOT an
 * AppError is treated as an unexpected bug and hidden behind a generic 500.
 */
export class AppError extends Error {
  public readonly statusCode: HttpStatusValue;
  public readonly code: ErrorCodeValue;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: HttpStatusValue = HttpStatus.INTERNAL,
    code: ErrorCodeValue = ErrorCode.INTERNAL,
    details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code: ErrorCodeValue = ErrorCode.BAD_REQUEST, details?: unknown) {
    super(message, HttpStatus.BAD_REQUEST, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, HttpStatus.UNPROCESSABLE, ErrorCode.VALIDATION, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code: ErrorCodeValue = ErrorCode.UNAUTHORIZED) {
    super(message, HttpStatus.UNAUTHORIZED, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code: ErrorCodeValue = ErrorCode.CONFLICT) {
    super(message, HttpStatus.CONFLICT, code);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, HttpStatus.TOO_MANY_REQUESTS, ErrorCode.RATE_LIMITED);
  }
}
