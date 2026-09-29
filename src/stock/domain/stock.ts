import { randomUUID } from 'node:crypto';
import type { Sku } from '../../shared/domain/sku';
import type { Cantidad } from './cantidad';
import { StockInsuficienteError } from './errors';
import type { Motivo } from './motivo';
import { Movimiento } from './movimiento';

/**
 * Aggregate root guarding the invariant `disponible >= 0` for one
 * `Sku`. Its only behaviour is `registrar`; it creates movements but
 * does not hold the history — loading every movement to change one
 * number would scale badly.
 */
export class Stock {
  /**
   * @param sku - Identifies the `Variante` this stock belongs to.
   * @param disponible - Units on hand; `0` for new stock, a persisted
   *   value when the adapter rehydrates.
   */
  constructor(
    readonly sku: Sku,
    private _disponible = 0,
  ) {}

  /**
   * New stock for a `Sku`, starting empty.
   */
  static crear(sku: Sku): Stock {
    return new Stock(sku, 0);
  }

  /**
   * Units currently available; the value the `disponible >= 0`
   * invariant protects.
   */
  get disponible(): number {
    return this._disponible;
  }

  /**
   * Applies `cantidad × direccion(motivo)` to `disponible` and returns
   * the `Movimiento` that records it.
   *
   * @param cantidad - Units moved (always positive; the `motivo`
   *   carries the sign).
   * @param motivo - Why the stock moves.
   * @param fecha - When it happened; passed in so callers decide the
   *   clock.
   * @returns The created `Movimiento`, id generated here.
   * @throws {@link StockInsuficienteError} when the delta would leave
   *   `disponible` negative; nothing is recorded and `disponible` is
   *   unchanged.
   * @remarks
   * Within one request this is the fast-fail check on the loaded
   * snapshot; the database's conditional UPDATE arbitrates concurrent
   * requests and maps to the same error.
   */
  registrar(cantidad: Cantidad, motivo: Motivo, fecha: Date): Movimiento {
    const movimiento = new Movimiento(
      randomUUID(),
      this.sku,
      cantidad,
      motivo,
      fecha,
    );
    const nuevoDisponible = this._disponible + movimiento.deltaConSigno();
    if (nuevoDisponible < 0) {
      throw new StockInsuficienteError(this.sku, this._disponible, cantidad);
    }
    this._disponible = nuevoDisponible;
    return movimiento;
  }
}
