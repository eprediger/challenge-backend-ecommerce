import { Injectable } from '@nestjs/common';
import type { Sku } from '../../shared/domain/sku';
import { enrichWideEvent } from '../../shared/infrastructure/http/request-context';
import type { Cantidad } from '../domain/cantidad';
import {
  ReintentoDistintoError,
  VarianteNoEncontradaError,
} from '../domain/errors';
import type { Motivo } from '../domain/motivo';
import type { Movimiento } from '../domain/movimiento';
import { Stock } from '../domain/stock';
import { StockRepository } from '../domain/stock.repository';

/**
 * Stock use cases. Speaks the domain language; persistence goes
 * through the {@link StockRepository} port.
 */
@Injectable()
export class StockService {
  constructor(private readonly stockRepository: StockRepository) {}

  /**
   * Creates a `Stock` with `cantidadDisponible` 0 for a `Sku` — the
   * only way one comes to exist (a variante and its stock are created
   * together; today the seed and the e2e arrange call this).
   */
  async createItem(sku: Sku): Promise<void> {
    await this.stockRepository.create(Stock.create(sku));
  }

  /**
   * Registers a movement on the `Stock` of `sku`. A
   * `idempotencyKey` makes the call safe to retry: a duplicate
   * returns the already-recorded `Movimiento` instead of applying
   * twice.
   *
   * @returns The recorded {@link Movimiento} — or its idempotent twin
   *   when `idempotencyKey` was seen before.
   * @throws {@link VarianteNoEncontradaError} when no stock exists
   *   for the SKU.
   * @throws {@link StockInsuficienteError} when the movement would
   *   leave `cantidadDisponible` negative — domain check on the
   *   snapshot; the adapter arbitrates concurrent losers the same way.
   */
  async registrarMovimiento(
    sku: Sku,
    cantidad: Cantidad,
    motivo: Motivo,
    idempotencyKey: string,
  ): Promise<Movimiento> {
    enrichWideEvent({
      sku: sku.valor,
      cantidad: cantidad.valor,
      motivo: motivo.code,
    });
    // Key reuse is answered before processing: identical → replay,
    // different payload → 422 (the draft's semantics).
    const existing = await this.stockRepository.findMovimiento(idempotencyKey);
    if (existing !== null) {
      if (
        existing.sku.valor !== sku.valor ||
        existing.cantidad.valor !== cantidad.valor ||
        existing.motivo !== motivo
      ) {
        throw new ReintentoDistintoError(idempotencyKey, existing, {
          sku,
          cantidad,
          motivo,
        });
      }
      return existing;
    }
    const stock = await this.stockRepository.find(sku);
    if (stock === null) {
      throw new VarianteNoEncontradaError(sku);
    }
    const movimiento = stock.registrar(cantidad, motivo, new Date());
    return this.stockRepository.save(movimiento, idempotencyKey);
  }

  /**
   * Units available for `sku` — "the system must always be able to
   * answer how much stock is available" (and the cart pre-check).
   *
   * @throws {@link VarianteNoEncontradaError} when no stock exists
   *   for the SKU.
   */
  async stockDisponible(sku: Sku): Promise<number> {
    enrichWideEvent({ sku: sku.valor });
    const stock = await this.stockRepository.find(sku);
    if (stock === null) {
      throw new VarianteNoEncontradaError(sku);
    }
    return stock.cantidadDisponible;
  }
}
