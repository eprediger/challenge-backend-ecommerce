import type { Sku } from '../../shared/domain/sku';
import type { Movimiento } from './movimiento';
import type { Stock } from './stock';

/**
 * Port for `Stock` persistence — an abstract class so it doubles as
 * the Nest DI token (no Symbol needed). The adapter enforces the
 * concurrency-spanning rules the aggregate cannot see.
 */
export abstract class StockRepository {
  /**
   * The `Stock` for `sku`, or `null` when the variante has none.
   */
  abstract find(sku: Sku): Promise<Stock | null>;

  /**
   * Persists a new `Stock` (created with `cantidadDisponible` 0).
   */
  abstract create(stock: Stock): Promise<void>;

  /**
   * The `Movimiento` persisted under `idempotencyKey`, or `null`.
   * Checked before `save` so a reused key is answered — replayed or
   * refused — before the movement is processed.
   */
  abstract findMovimiento(
    idempotencyKey: string,
  ): Promise<Movimiento | null>;

  /**
   * Persists a `Movimiento` under `idempotencyKey` and applies its
   * delta to `cantidadDisponible`, atomically. A duplicate key returns
   * the already-persisted `Movimiento` instead of applying twice.
   *
   * @returns The `Movimiento` that ended up persisted — `movimiento`
   *   itself, or its idempotent twin.
   */
  abstract save(
    movimiento: Movimiento,
    idempotencyKey: string,
  ): Promise<Movimiento>;
}
