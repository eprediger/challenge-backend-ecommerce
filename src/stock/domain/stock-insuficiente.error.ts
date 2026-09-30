import type { Sku } from '../../shared/domain/sku';
import type { Cantidad } from './cantidad';

/**
 * Thrown when a SALIDA `Movimiento` would leave `cantidadDisponible`
 * negative. Carries `cantidadDisponible` so the error filter can emit
 * it as the `stockDisponible` extension member of the 409 problem
 * detail.
 */
export class StockInsuficienteError extends Error {
  readonly summary = 'Stock insuficiente';

  /**
   * The units on hand when the movement was rejected.
   */
  readonly cantidadDisponible: number;

  constructor(sku: Sku, cantidadDisponible: number, cantidad: Cantidad) {
    super(
      `Stock insuficiente para "${sku.valor}": disponible ${cantidadDisponible}, solicitado ${cantidad.valor}`,
    );
    this.name = 'StockInsuficienteError';
    this.cantidadDisponible = cantidadDisponible;
  }
}
