/**
 * Thrown when `POST /stock/movimientos` arrives without a usable
 * `Idempotency-Key` — the server refuses a movement it cannot
 * deduplicate (400 per draft-ietf-httpapi-idempotency-key-header).
 * A header-validation error, not a body one: it gets its own problem
 * type so clients can tell what was missing.
 */
export class ClaveIdempotenciaRequeridaError extends Error {
  readonly summary = 'Idempotency-Key requerido';

  constructor() {
    super(
      'El encabezado Idempotency-Key es obligatorio y no puede estar vacío',
    );
    this.name = 'ClaveIdempotenciaRequeridaError';
  }
}
