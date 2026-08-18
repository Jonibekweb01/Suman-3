import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async handler so a rejected promise reaches the Express error
 * pipeline instead of hanging the request. Every controller is wrapped.
 */
export function asyncHandler<
  Req extends Request = Request,
  Res extends Response = Response,
>(handler: (req: Req, res: Res, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    handler(req as Req, res as Res, next).catch(next);
  };
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  nextCursor?: string | null;
  [key: string]: unknown;
}

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

/** Uniform success envelope — the client never has to guess the shape. */
export function ok<T>(res: Response, data: T, meta?: ApiMeta, statusCode = 200): Response {
  const body: ApiSuccessBody<T> = meta ? { success: true, data, meta } : { success: true, data };
  return res.status(statusCode).json(body);
}

export function created<T>(res: Response, data: T): Response {
  return ok(res, data, undefined, 201);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}
