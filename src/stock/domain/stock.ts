import { randomUUID } from 'node:crypto';
import type { Sku } from '../../shared/domain/sku';
import type { Cantidad } from './cantidad';
import { StockInsuficienteError } from './errors';
import type { Motivo } from './motivo';
import { Movimiento } from './movimiento';

/**
 * Aggregate root guarding the invariant `cantidadDisponible >= 0` for
 * one `Sku`. Its only behaviour is `registrar`; it creates movements
 * but does not hold the history — loading every movement to change one
 * number would scale badly.
 */
export class Stock {
  /**
   * @param sku - Identifies the `Variante` this stock belongs to.
   * @param cantidadDisponible - Units on hand; `0` for new stock, a
   *   persisted value when the adapter rehydrates.
   */
  constructor(
    readonly sku: Sku,
    private _cantidadDisponible = 0,
  ) {}

  /**
   * New stock for a `Sku`, starting empty.
   */
  static create(sku: Sku): Stock {
    return new Stock(sku, 0);
  }

  /**
   * Units currently available; the value the `cantidadDisponible >= 0`
   * invariant protects.
   */
  get cantidadDisponible(): number {
    return this._cantidadDisponible;
  }

  /**
   * Applies `cantidad × direccion(motivo)` to `cantidadDisponible` and
   * returns the `Movimiento` that records it.
   *
   * @param cantidad - Units moved (always positive; the `motivo`
   *   carries the sign).
   * @param motivo - Why the stock moves.
   * @param fecha - When it happened; passed in so callers decide the
   *   clock.
   * @returns The created `Movimiento`, id generated here.
   * @throws {@link StockInsuficienteError} when the delta would leave
   *   `cantidadDisponible` negative; nothing is recorded and
   *   `cantidadDisponible` is unchanged.
   * @remarks
   * Within one request this is the fast-fail check on the loaded
   * snapshot; the database's conditional UPDATE arbitrates concurrent
   * requests and maps to the same error.
   */
  registrar(cantidad: Cantidad, motivo: Motivo, fecha: Date): Movimiento {
    const delta = cantidad.valor * motivo.direccion;
    const newCantidadDisponible = this._cantidadDisponible + delta;
    if (newCantidadDisponible < 0) {
      throw new StockInsuficienteError(
        this.sku,
        this._cantidadDisponible,
        cantidad,
      );
    }
    const movimiento = new Movimiento(
      randomUUID(),
      this.sku,
      cantidad,
      motivo,
      fecha,
    );
    this._cantidadDisponible = newCantidadDisponible;
    return movimiento;
  }
}
