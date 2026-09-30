import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * `stock` table — one row per variante, identified by the shared `Sku`
 * (`text`, same wire form everywhere). `CHECK cantidad_disponible >= 0`
 * is the backstop for the aggregate's only invariant. No FK to
 * `variante.sku` on purpose: declaring it needs an ORM relation, which
 * would import a Catalogo entity — contexts meet only at `Sku`;
 * `createItem` is the enforcement point instead.
 */
@Entity({ name: 'stock' })
@Check('"cantidad_disponible" >= 0')
export class StockOrmEntity {
  @PrimaryColumn({ type: 'text' })
  sku!: string;

  @Column({ name: 'cantidad_disponible', type: 'int', default: 0 })
  cantidadDisponible!: number;
}
