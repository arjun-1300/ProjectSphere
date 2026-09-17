import type { Response } from 'express';
import { HttpStatus, type HttpStatusValue } from '../errors/errorCodes.js';

/**
 * The single response envelope used across the whole API:
 *   { success, message, data, errors }
 *
 * Keeping this consistent means the frontend has exactly one shape to parse.
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: unknown | null;
  meta?: Record<string, unknown>;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode: HttpStatusValue = HttpStatus.OK,
  meta?: Record<string, unknown>,
): Response {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
    errors: null,
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode: HttpStatusValue = HttpStatus.INTERNAL,
  errors: unknown = null,
): Response {
  const body: ApiResponse<null> = {
    success: false,
    message,
    data: null,
    errors,
  };
  return res.status(statusCode).json(body);
}
