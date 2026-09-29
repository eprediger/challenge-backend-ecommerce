import { Check, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Motivo } from '../../domain/motivo';
import { StockOrmEntity } from './stock.orm-entity';

/**
 * `movimiento_stock` table — the movement ledger. `delta` is stored
 * signed so `cantidad_disponible` is a plain `SUM(delta)` per sku (the
 * SQL invariant check); `CHECK delta <> 0` backstops the `Cantidad`
 * rule.
 */
@Entity({ name: 'movimiento_stock' })
@Check('"delta" <> 0')
export class MovimientoStockOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  sku!: string;

  /**
   * Signed units: positive for ENTRADA, negative for SALIDA.
   * `Cantidad = |delta|` is rebuilt by the mapper.
   */
  @Column({ type: 'int' })
  delta!: number;

  @Column({
    type: 'simple-enum',
    enum: Motivo.todos.map((m) => m.clave),
  })
  motivo!: string;

  @Column({ type: 'datetime' })
  fecha!: Date;

  /** Same `sku` column; the relation adds the real FK to `stock`. */
  @ManyToOne(() => StockOrmEntity)
  @JoinColumn({ name: 'sku' })
  stock!: StockOrmEntity;
}
