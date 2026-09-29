import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { Sku } from '../../../shared/domain/sku';
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
   * Writes the delta, never an in-memory absolute:
   * `cantidad_disponible` is incremented by
   * `movimiento.deltaConSigno()` inside one transaction with the
   * movement insert.
   */
  async guardar(movimiento: Movimiento): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      await em.update(
        StockOrmEntity,
        { sku: movimiento.sku.valor },
        {
          cantidadDisponible: () =>
            `cantidad_disponible + ${movimiento.deltaConSigno()}`,
        },
      );
      await em.insert(MovimientoStockOrmEntity, {
        id: movimiento.id,
        sku: movimiento.sku.valor,
        delta: movimiento.deltaConSigno(),
        motivo: movimiento.motivo.clave,
        fecha: movimiento.fecha,
      });
    });
  }
}
