import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../shared/errors/AppError.js';
import { ErrorCode, HttpStatus } from '../shared/errors/errorCodes.js';
import { sendError } from '../shared/utils/response.js';
import { isProd } from '../config/env.js';

/**
 * Central error handler. Every thrown error (via asyncHandler or next(err))
 * ends up here and is converted into the standard { success, message, data,
 * errors } envelope. Unknown errors are hidden behind a generic 500 in prod.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // next is required for Express to recognize this as an error handler.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): Response {
  // 1) Zod validation errors (thrown outside the validate middleware)
  if (err instanceof ZodError) {
    return sendError(
      res,
      'Validation failed',
      HttpStatus.UNPROCESSABLE,
      formatZodError(err),
    );
  }

  // 2) Multer upload errors (duck-typed to avoid importing multer here)
  if (err instanceof Error && err.name === 'MulterError') {
    const code = (err as Error & { code?: string }).code;
    const message =
      code === 'LIMIT_FILE_SIZE'
        ? 'File is too large'
        : code === 'LIMIT_FILE_COUNT' || code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Too many files or unexpected field'
          : `Upload error: ${err.message}`;
    return sendError(res, message, HttpStatus.BAD_REQUEST, { code: ErrorCode.BAD_REQUEST });
  }

  // 3) Our own operational errors
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, {
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // 3) Known Prisma errors → friendly messages
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(err, res);
  }

  // 4) Unknown / unexpected → log full detail, return generic 500
  const requestId = req.id ?? 'unknown';
  // eslint-disable-next-line no-console
  console.error(`[${requestId}] Unhandled error:`, err);

  return sendError(
    res,
    isProd ? 'Something went wrong' : String((err as Error)?.message ?? err),
    HttpStatus.INTERNAL,
    {
      code: ErrorCode.INTERNAL,
      ...(isProd ? {} : { stack: (err as Error)?.stack }),
    },
  );
}

function handlePrismaError(
  err: Prisma.PrismaClientKnownRequestError,
  res: Response,
): Response {
  switch (err.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return sendError(res, `A record with this ${target} already exists`, HttpStatus.CONFLICT, {
        code: ErrorCode.CONFLICT,
      });
    }
    case 'P2025':
      // Record not found for the operation
      return sendError(res, 'Requested record was not found', HttpStatus.NOT_FOUND, {
        code: ErrorCode.NOT_FOUND,
      });
    case 'P2003':
      // Foreign key constraint failed
      return sendError(res, 'Related record does not exist', HttpStatus.BAD_REQUEST, {
        code: ErrorCode.BAD_REQUEST,
      });
    default:
      return sendError(res, 'Database error', HttpStatus.INTERNAL, {
        code: ErrorCode.INTERNAL,
        ...(isProd ? {} : { prismaCode: err.code }),
      });
  }
}

/** Turn a ZodError into a compact field → messages map. */
export function formatZodError(err: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}
