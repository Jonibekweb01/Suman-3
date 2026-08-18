import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError, NotFoundError } from '../core/errors';
import { logger } from '../core/logger';

interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
    stack?: string;
  };
}

/**
 * Translates infrastructure errors into `AppError`s. Prisma's messages embed
 * the SQL and column names, so they must never be forwarded verbatim.
 */
function normalize(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return new AppError(
      'Validation failed',
      422,
      'VALIDATION_ERROR',
      error.issues.map((issue) => ({
        field: issue.path.join('.') || '_root',
        message: issue.message,
      })),
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const target = (error.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
        return new AppError(`A record with this ${target} already exists`, 409, 'CONFLICT');
      }
      case 'P2025':
        return new AppError('Record not found', 404, 'NOT_FOUND');
      case 'P2003':
        return new AppError('Related record does not exist', 400, 'FOREIGN_KEY_VIOLATION');
      case 'P2014':
        return new AppError('Operation would break a required relation', 400, 'RELATION_VIOLATION');
      default:
        return new AppError('Database request failed', 400, 'DATABASE_ERROR');
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError('Malformed database query', 400, 'DATABASE_VALIDATION_ERROR');
  }

  // The database is down or unreachable. Prisma's message embeds the
  // connection string's host and the failing source file, so it is replaced
  // wholesale — and 503 tells the load balancer to retry elsewhere.
  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return new AppError(
      'Service temporarily unavailable. Please try again shortly.',
      503,
      'SERVICE_UNAVAILABLE',
      undefined,
      false,
    );
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? `File exceeds the ${env.MAX_UPLOAD_MB}MB limit`
        : `Upload rejected: ${error.code}`;
    return new AppError(message, 413, 'UPLOAD_ERROR');
  }

  // Body-parser surfaces malformed JSON as a SyntaxError carrying `body`.
  if (error instanceof SyntaxError && 'body' in error) {
    return new AppError('Malformed JSON payload', 400, 'INVALID_JSON');
  }

  const message = error instanceof Error ? error.message : 'Unexpected error';
  return new AppError(message, 500, 'INTERNAL_ERROR', undefined, false);
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const error = normalize(err);

  const logPayload = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    statusCode: error.statusCode,
    code: error.code,
    userId: req.user?.id,
  };

  if (error.statusCode >= 500 || !error.isOperational) {
    logger.error({ ...logPayload, err }, error.message);
  } else {
    logger.warn(logPayload, error.message);
  }

  const body: ErrorBody = {
    success: false,
    error: {
      code: error.code,
      // A 500's real message can name internal hosts or table columns.
      message:
        error.statusCode >= 500 && env.isProduction
          ? 'Something went wrong on our side. Please try again.'
          : error.message,
      requestId: req.id,
    },
  };

  if (error.details !== undefined) body.error.details = error.details;
  if (!env.isProduction && err instanceof Error && err.stack) body.error.stack = err.stack;

  // Headers may already be flushed by a streaming response.
  if (res.headersSent) {
    res.end();
    return;
  }

  res.status(error.statusCode).json(body);
};
