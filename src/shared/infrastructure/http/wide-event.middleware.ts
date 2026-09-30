import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import type { Env } from '../../../env';
import { requestContext } from './request-context';

const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', '..', 'package.json'), 'utf8'),
) as { name: string; version: string };

/**
 * Environment context for every event — assembled once, here.
 * Sources are mixed on purpose: identity comes from package.json
 * (the source of truth, always present), `commitHash`/`nodeEnv` from
 * the validated env (COMMIT_HASH is injected by CI at deploy time —
 * unset locally, the field is simply omitted), `instanceId` is the
 * container hostname.
 */
function eventContext(config: ConfigService<Env, true>): Record<string, unknown> {
  return {
    service: pkg.name,
    version: pkg.version,
    commitHash: config.get('app.commitHash', { infer: true }),
    instanceId: hostname(),
    nodeEnv: config.get('app.nodeEnv', { infer: true }),
  };
}

/**
 * One structured event per request, emitted exactly once as a JSON
 * line when the response finishes (`res.on('finish')` sees the real
 * status code, including ones set by exception filters — an
 * interceptor's `finalize` would run too early, and `als.run` must
 * wrap the whole pipeline so route handlers keep the context).
 * `requestId` honors an inbound `x-request-id` header so callers can
 * correlate, else a fresh UUID.
 */
export function wideEventMiddleware(config: ConfigService<Env, true>) {
  const envContext = eventContext(config);
  return (req: Request, res: Response, next: NextFunction): void => {
    const startedAt = Date.now();
    const event: Record<string, unknown> = {
      ...envContext,
      requestId: req.header('x-request-id') ?? randomUUID(),
      method: req.method,
      path: req.originalUrl.split('?')[0],
    };
    res.once('finish', () => {
      event.statusCode = res.statusCode;
      event.durationMs = Date.now() - startedAt;
      const outcome = res.statusCode >= 500 ? 'error' : 'result';
      event.outcome = outcome;
      event.level = outcome === 'error' ? 'error' : 'info';
      console.log(JSON.stringify(event));
    });
    requestContext.run(event, next);
  };
}
