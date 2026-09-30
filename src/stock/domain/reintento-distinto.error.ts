import type { Cantidad } from './cantidad';
import type { Motivo } from './motivo';
import type { Movimiento } from './movimiento';
import type { Sku } from '../../shared/domain/sku';

/**
 * The identifying fields of a movement request — what a retry must
 * repeat verbatim (fecha is server-side, never part of the payload).
 */
export interface MovimientoPayload {
  readonly sku: Sku;
  readonly cantidad: Cantidad;
  readonly motivo: Motivo;
}

/**
 * Thrown when an `Idempotency-Key` is replayed carrying a *different*
 * movement — a key reuse bug or misuse, never a legitimate retry.
 * The recorded movement is untouched; only the caller's attempt is
 * refused (HTTP 422 per draft-ietf-httpapi-idempotency-key-header).
 */
export class ReintentoDistintoError extends Error {
  readonly summary = 'Reintento distinto';

  constructor(
    readonly idempotencyKey: string,
    readonly persisted: Movimiento,
    readonly received: MovimientoPayload,
  ) {
    super(
      `La clave "${idempotencyKey}" ya fue usada con otro movimiento ` +
        `(${persisted.motivo.code} ${persisted.cantidad.valor} de ${persisted.sku.valor}; ` +
        `recibido ${received.motivo.code} ${received.cantidad.valor} de ${received.sku.valor})`,
    );
    this.name = 'ReintentoDistintoError';
  }
}
