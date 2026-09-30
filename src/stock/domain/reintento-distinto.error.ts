import type { Cantidad } from './cantidad';
import type { Motivo } from './motivo';
import type { Movimiento } from './movimiento';
import type { Sku } from '../../shared/domain/sku';

/**
 * The identifying fields of a movement request — what a retry must
 * repeat verbatim (fecha is server-side, never part of the payload).
 */
export interface DatosMovimiento {
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
    readonly claveIdempotencia: string,
    readonly persistido: Movimiento,
    readonly recibido: DatosMovimiento,
  ) {
    super(
      `La clave "${claveIdempotencia}" ya fue usada con otro movimiento ` +
        `(${persistido.motivo.clave} ${persistido.cantidad.valor} de ${persistido.sku.valor}; ` +
        `recibido ${recibido.motivo.clave} ${recibido.cantidad.valor} de ${recibido.sku.valor})`,
    );
    this.name = 'ReintentoDistintoError';
  }
}
