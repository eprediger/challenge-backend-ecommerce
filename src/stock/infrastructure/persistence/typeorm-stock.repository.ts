import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { Sku } from '../../../shared/domain/sku';
import { Cantidad } from '../../domain/cantidad';
import {
  CantidadInvalidaError,
  ReintentoDistintoError,
  StockInsuficienteError,
  VarianteNoEncontradaError,
} from '../../domain/errors';
import { Motivo } from '../../domain/motivo';
import { Movimiento } from '../../domain/movimiento';
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

  async find(sku: Sku): Promise<Stock | null> {
    const row = await this.dataSource
      .getRepository(StockOrmEntity)
      .findOneBy({ sku: sku.valor });
    return row === null ? null : new Stock(sku, row.cantidadDisponible);
  }

  async create(stock: Stock): Promise<void> {
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
   *
   * With `idempotencyKey`, the unique index on
   * `idempotency_key` arbitrates retries: on violation the whole
   * transaction rolls back and the already-persisted movement is
   * re-read — an identical payload gets it replayed, a different
   * payload is refused with `ReintentoDistintoError` (422).
   */
  async save(
    movimiento: Movimiento,
    idempotencyKey: string,
  ): Promise<Movimiento> {
    return this.serialized(async () => {
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
              delta: movimiento.signedDelta(),
            })
            .execute();
          if (result.affected === 0) {
            const row = await em
              .getRepository(StockOrmEntity)
              .findOneBy({ sku: movimiento.sku.valor });
            if (row === null) {
              throw new VarianteNoEncontradaError(movimiento.sku);
            }
            throw new StockInsuficienteError(
              movimiento.sku,
              row.cantidadDisponible,
              movimiento.cantidad,
            );
          }
          await em.insert(MovimientoStockOrmEntity, {
            id: movimiento.id,
            sku: movimiento.sku.valor,
            delta: movimiento.signedDelta(),
            idempotencyKey,
            motivo: movimiento.motivo.code,
            fecha: movimiento.fecha,
          });
        });
        return movimiento;
      } catch (error) {
        const existing = await this.findMovimiento(idempotencyKey);
        if (existing !== null) {
          if (
            existing.sku.valor !== movimiento.sku.valor ||
            existing.cantidad.valor !== movimiento.cantidad.valor ||
            existing.motivo !== movimiento.motivo
          ) {
            throw new ReintentoDistintoError(
              idempotencyKey,
              existing,
              movimiento,
            );
          }
          return existing;
        }
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
   * The `Movimiento` persisted under `idempotencyKey`, or `null`.
   * Rehydrates from the ledger row — `Cantidad` is `|delta|`.
   */
  async findMovimiento(
    code: string,
  ): Promise<Movimiento | null> {
    const row = await this.dataSource
      .getRepository(MovimientoStockOrmEntity)
      .findOneBy({ idempotencyKey: code });
    if (row === null) {
      return null;
    }
    return new Movimiento(
      row.id,
      new Sku(row.sku),
      new Cantidad(Math.abs(row.delta)),
      Motivo.from(row.motivo),
      row.fecha,
    );
  }

  /**
   * ponytail: promise-chain mutex — sqlite's single connection rejects
   * overlapping write transactions (`SQLITE_BUSY`), so `save`
   * serializes them. Postgres relies on row locks instead and skips
   * this. Ceiling: one stock writer at a time per process; if write
   * throughput ever matters on sqlite, WAL + `busy_timeout` is the
   * upgrade.
   */
  private writeChain: Promise<unknown> = Promise.resolve();

  private serialized<T>(fn: () => Promise<T>): Promise<T> {
    if (this.dataSource.options.type !== 'sqlite') {
      return fn();
    }
    const result = this.writeChain.then(fn, fn);
    this.writeChain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
