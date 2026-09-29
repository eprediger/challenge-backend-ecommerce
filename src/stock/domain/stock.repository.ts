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
  abstract buscar(sku: Sku): Promise<Stock | null>;

  /**
   * Persists a new `Stock` (created with `cantidadDisponible` 0).
   */
  abstract crear(stock: Stock): Promise<void>;

  /**
   * Persists a `Movimiento` and applies its delta to
   * `cantidadDisponible`,
   * atomically.
   */
  abstract guardar(movimiento: Movimiento): Promise<void>;
}
