import express, { type Application, type Request } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import hpp from 'hpp';
import { env, isProd, isTest } from './config/env.js';
import { requestId } from './middleware/requestId.middleware.js';
import { notFound } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { sanitizeBody } from './middleware/sanitize.middleware.js';
import { globalLimiter } from './middleware/rateLimiters.js';
import apiRoutes from './routes/index.js';

export function createApp(): Application {
  const app = express();

  // Behind a proxy (Railway/Render/Vercel) so req.ip and secure cookies work.
  app.set('trust proxy', 1);

  // Security headers with a strict-ish CSP. defaultSrc 'self' locks the API
  // down; the inline allowances exist only so the Swagger UI docs page renders.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS — credentials enabled so the httpOnly refresh cookie is accepted.
  app.use(cors({ origin: env.CLIENT_ORIGINS, credentials: true }));

  // Body parsing (1MB cap) + cookies + gzip.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(compression());

  // HTTP Parameter Pollution protection + XSS input sanitization.
  app.use(hpp());
  app.use(sanitizeBody);

  // Per-request id, then request logging that includes it.
  app.use(requestId);
  morgan.token('id', (req: Request) => req.id);
  if (!isTest) {
    app.use(
      morgan(
        isProd
          ? ':id :remote-addr :method :url :status :response-time ms'
          : ':id :method :url :status :response-time ms',
      ),
    );
  }

  // Global rate limit (100 / 15min per IP) across the whole API.
  app.use(env.API_PREFIX, globalLimiter, apiRoutes);

  // 404 + centralized error handling (must be last).
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
