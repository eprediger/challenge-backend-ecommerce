import type { Sku } from '../../shared/domain/sku';

/**
 * Thrown when no `Stock` exists for a `Sku` — the variante is unknown
 * to the stock context.
 */
export class VarianteNoEncontradaError extends Error {
  readonly summary = 'Variante no encontrada';

  constructor(sku: Sku) {
    super(`No existe stock para la variante "${sku.valor}"`);
    this.name = 'VarianteNoEncontradaError';
  }
}
