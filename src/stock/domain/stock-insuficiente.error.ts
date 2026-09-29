import type { Sku } from '../../shared/domain/sku';
import type { Cantidad } from './cantidad';

/**
 * Thrown when a SALIDA `Movimiento` would leave `disponible` negative.
 * Carries `stockDisponible` so the error filter can include it as an
 * extension member of the 409 problem detail.
 */
export class StockInsuficienteError extends Error {
  /**
   * The units on hand when the movement was rejected.
   */
  readonly stockDisponible: number;

  constructor(sku: Sku, disponible: number, cantidad: Cantidad) {
    super(
      `Stock insuficiente para "${sku.valor}": disponible ${disponible}, solicitado ${cantidad.valor}`,
    );
    this.name = 'StockInsuficienteError';
    this.stockDisponible = disponible;
  }
}
