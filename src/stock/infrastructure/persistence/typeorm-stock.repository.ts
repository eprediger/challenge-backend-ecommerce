import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import type { Sku } from '../../../shared/domain/sku';
import {
  CantidadInvalidaError,
  StockInsuficienteError,
  VarianteNoEncontradaError,
} from '../../domain/errors';
import type { Movimiento } from '../../domain/movimiento';
import { Stock } from '../../domain/stock';
import { StockRepository } from '../../domain/stock.repository';
import { MovimientoStockOrmEntity } from './movimiento-stock.orm-entity';
import { StockOrmEntity } from './stock.orm-entity';

/**
 * TypeORM adapter for the {@link StockRepository} port.
 */
@Injectable()
export class TypeOrmStockRepository extends StockRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    super();
  }

  async buscar(sku: Sku): Promise<Stock | null> {
    const fila = await this.dataSource
      .getRepository(StockOrmEntity)
      .findOneBy({ sku: sku.valor });
    return fila === null ? null : new Stock(sku, fila.cantidadDisponible);
  }

  async crear(stock: Stock): Promise<void> {
    await this.dataSource.getRepository(StockOrmEntity).insert({
      sku: stock.sku.valor,
      cantidadDisponible: stock.cantidadDisponible,
    });
  }

  /**
   * Writes the delta, never an in-memory absolute, via an atomic
   * conditional update:
   * `UPDATE stock SET cantidad_disponible = cantidad_disponible + :delta
   *  WHERE sku = :sku AND cantidad_disponible + :delta >= 0`.
   * A zero-row update means a concurrent movement won the balance,
   * so the fresh row is read back for the
   * {@link StockInsuficienteError}. The movement inserts in the same
   * transaction.
   */
  async guardar(movimiento: Movimiento): Promise<void> {
    await this.serializado(async () => {
      try {
        await this.dataSource.transaction(async (em) => {
          const result = await em
            .createQueryBuilder()
            .update(StockOrmEntity)
            .set({
              cantidadDisponible: () =>
                'cantidad_disponible + :delta',
            })
            .where('sku = :sku AND cantidad_disponible + :delta >= 0')
            .setParameters({
              sku: movimiento.sku.valor,
              delta: movimiento.deltaConSigno(),
            })
            .execute();
          if (result.affected === 0) {
            const fila = await em
              .getRepository(StockOrmEntity)
              .findOneBy({ sku: movimiento.sku.valor });
            if (fila === null) {
              throw new VarianteNoEncontradaError(movimiento.sku);
            }
            throw new StockInsuficienteError(
              movimiento.sku,
              fila.cantidadDisponible,
              movimiento.cantidad,
            );
          }
          await em.insert(MovimientoStockOrmEntity, {
            id: movimiento.id,
            sku: movimiento.sku.valor,
            delta: movimiento.deltaConSigno(),
            motivo: movimiento.motivo.clave,
            fecha: movimiento.fecha,
          });
        });
      } catch (error) {
        // Postgres `22003` — a delta beyond int4 range is a domain
        // invalid quantity, not an infrastructure failure.
        if (
          error instanceof QueryFailedError &&
          (error.driverError as { code?: string }).code === '22003'
        ) {
          throw new CantidadInvalidaError(movimiento.cantidad.valor);
        }
        throw error;
      }
    });
  }

  /**
   * ponytail: promise-chain mutex — sqlite's single connection rejects
   * overlapping write transactions (`SQLITE_BUSY`), so `guardar`
   * serializes them. Postgres relies on row locks instead and skips
   * this. Ceiling: one stock writer at a time per process; if write
   * throughput ever matters on sqlite, WAL + `busy_timeout` is the
   * upgrade.
   */
  private escritura: Promise<unknown> = Promise.resolve();

  private serializado<T>(fn: () => Promise<T>): Promise<T> {
    if (this.dataSource.options.type !== 'sqlite') {
      return fn();
    }
    const result = this.escritura.then(fn, fn);
    this.escritura = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
