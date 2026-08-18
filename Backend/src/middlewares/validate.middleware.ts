import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny, z } from 'zod';
import { ValidationError } from '../core/errors';

export interface RequestSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function formatIssues(error: ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '_root',
    message: issue.message,
  }));
}

/**
 * Parses and REPLACES `req.body` / `req.query` / `req.params` with the schema
 * output. Because Zod strips unknown keys by default, nothing the client sends
 * beyond the contract ever reaches a service — this is the mass-assignment
 * guard, not just a shape check.
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Request['params'];
      }
      if (schemas.query) {
        // `req.query` has only a getter in Express 5; assign through
        // defineProperty so the same code works on both major versions.
        const parsedQuery = schemas.query.parse(req.query);
        Object.defineProperty(req, 'query', {
          value: parsedQuery,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError(formatIssues(error)));
        return;
      }
      next(error);
    }
  };
}

/** Shared primitives so ids and pagination validate identically everywhere. */
export const idParamSchema = z.object({
  id: z.string().cuid('Invalid identifier'),
});

export const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Invalid slug'),
});
