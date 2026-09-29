import type { Sku } from '../../shared/domain/sku';
import type { Cantidad } from './cantidad';
import type { Motivo } from './motivo';

/**
 * Immutable entity: the record of one stock movement. Always created
 * valid by `Stock.registrar` — a `Movimiento` with `delta = 0` cannot
 * exist because a `Cantidad` cannot be zero.
 */
export class Movimiento {
  constructor(
    readonly id: string,
    readonly sku: Sku,
    readonly cantidad: Cantidad,
    readonly motivo: Motivo,
    readonly fecha: Date,
  ) {}

  /**
   * The signed amount this movement adds to `cantidadDisponible`:
   * `cantidad × direccion` (positive for ENTRADA, negative for SALIDA).
   * Stored signed so `cantidadDisponible` is a plain `SUM` of
   * movements.
   *
   * @returns The signed delta, never zero.
   */
  deltaConSigno(): number {
    return this.cantidad.valor * this.motivo.direccion;
  }
}
