import path from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import { HEADER_NAMES } from './config/constants';
import { env } from './config/env';
import { ForbiddenError } from './core/errors';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { globalLimiter } from './middlewares/rateLimit.middleware';
import { requestId } from './middlewares/requestId.middleware';
import { apiRouter } from './routes';

export function createApp(): Application {
  const app = express();

  // Behind nginx / a load balancer, `req.ip` and `secure` are only correct if
  // Express is told to trust the proxy's forwarding headers. Rate limiting
  // keys off `req.ip`, so getting this wrong would bucket every user together.
  app.set('trust proxy', env.isProduction ? 1 : false);
  app.disable('x-powered-by');

  app.use(requestId);

  app.use(
    helmet({
      // Clickjacking: the API is not meant to be framed by anyone.
      frameguard: { action: 'deny' },
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'none'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          scriptSrc: ["'none'"],
          styleSrc: ["'none'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // storefront loads /uploads
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: env.isProduction ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin requests, curl and native mobile shells send no Origin.
        if (!origin) return callback(null, true);
        if (env.CORS_ORIGINS.includes(origin)) return callback(null, true);
        callback(new ForbiddenError(`Origin ${origin} is not allowed`));
      },
      // Required for the HttpOnly refresh cookie to travel cross-origin.
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', HEADER_NAMES.csrfToken, HEADER_NAMES.requestId],
      exposedHeaders: [HEADER_NAMES.requestId],
      maxAge: 86_400,
    }),
  );

  app.use(compression());
  // A 100kb ceiling is generous for JSON; file bytes go through multer.
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());

  app.use(globalLimiter);

  // Uploaded images. `index: false` stops directory listing, and the long
  // max-age is safe because filenames are content-unique.
  app.use(
    `/${env.UPLOAD_DIR}`,
    express.static(path.resolve(process.cwd(), env.UPLOAD_DIR), {
      index: false,
      dotfiles: 'deny',
      maxAge: env.isProduction ? '365d' : 0,
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }),
  );

  app.use(env.API_PREFIX, apiRouter);

  app.get('/', (_req, res) => {
    res.json({
      name: 'Suman API',
      version: '1.0.0',
      docs: `${env.API_PREFIX}/health`,
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
