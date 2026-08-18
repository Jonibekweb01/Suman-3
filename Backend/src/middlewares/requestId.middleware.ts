import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { HEADER_NAMES } from '../config/constants';

/**
 * Correlation id for tracing one request across logs. Reuses an upstream
 * value when a proxy already assigned one.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(HEADER_NAMES.requestId);
  const id = incoming && incoming.length <= 128 ? incoming : crypto.randomUUID();
  req.id = id;
  res.setHeader(HEADER_NAMES.requestId, id);
  next();
}
