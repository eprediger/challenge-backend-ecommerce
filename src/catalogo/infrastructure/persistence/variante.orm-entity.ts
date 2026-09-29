import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProductoOrmEntity } from './producto.orm-entity';

/**
 * Composition inside `Producto`: a variante cannot exist without its
 * producto (hence the cascade). `sku` — unique across variantes — is
 * the only link the Stock context sees.
 */
@Entity({ name: 'variante' })
export class VarianteOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  sku!: string;

  /** Same `producto_id` column as a plain property (see ProductoOrmEntity). */
  @Column({ name: 'producto_id', type: 'uuid' })
  productoId!: string;

  @ManyToOne(() => ProductoOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'producto_id' })
  producto!: ProductoOrmEntity;
}
