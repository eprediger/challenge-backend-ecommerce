import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request store holding the wide event being built. The
 * `wideEventMiddleware` runs the request inside it; any layer can
 * enrich the event without passing it through signatures.
 */
export const requestContext = new AsyncLocalStorage<
  Record<string, unknown>
>();

/**
 * Adds fields to the current request's wide event. No-op outside a
 * request (e.g. the seed calling services directly).
 */
export function enrichWideEvent(fields: Record<string, unknown>): void {
  const event = requestContext.getStore();
  if (event) {
    Object.assign(event, fields);
  }
}
