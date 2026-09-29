import { Injectable } from '@nestjs/common';
import type { Sku } from '../../shared/domain/sku';
import { enrichWideEvent } from '../../shared/infrastructure/http/request-context';
import type { Cantidad } from '../domain/cantidad';
import { VarianteNoEncontradaError } from '../domain/errors';
import type { Motivo } from '../domain/motivo';
import type { Movimiento } from '../domain/movimiento';
import { Stock } from '../domain/stock';
import { StockRepository } from '../domain/stock.repository';

/**
 * The movement and the `cantidadDisponible` it leaves behind,
 * returned by {@link StockService.registrarMovimiento} — the 201
 * response body.
 */
interface MovimientoRegistrado {
  movimiento: Movimiento;
  cantidadDisponible: number;
}

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
  async crearItem(sku: Sku): Promise<void> {
    await this.stockRepository.crear(Stock.crear(sku));
  }

  /**
   * Registers a movement on the `Stock` of `sku`.
   *
   * @returns The recorded {@link Movimiento} and the new
   *   `cantidadDisponible`.
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
  ): Promise<MovimientoRegistrado> {
    enrichWideEvent({
      sku: sku.valor,
      cantidad: cantidad.valor,
      motivo: motivo.clave,
    });
    const stock = await this.stockRepository.buscar(sku);
    if (stock === null) {
      throw new VarianteNoEncontradaError(sku);
    }
    const movimiento = stock.registrar(cantidad, motivo, new Date());
    await this.stockRepository.guardar(movimiento);
    return { movimiento, cantidadDisponible: stock.cantidadDisponible };
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
    const stock = await this.stockRepository.buscar(sku);
    if (stock === null) {
      throw new VarianteNoEncontradaError(sku);
    }
    return stock.cantidadDisponible;
  }
}
