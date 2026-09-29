import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { CategoriaOrmEntity } from './categoria.orm-entity';

/**
 * `Dinero` persists as integer minor units (`precio_centavos` +
 * `moneda`), never a float.
 */
@Entity({ name: 'producto' })
export class ProductoOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  nombre!: string;

  @Column({ type: 'text' })
  descripcion!: string;

  @Column({ name: 'precio_centavos', type: 'int' })
  precioCentavos!: number;

  @Column({ type: 'text' })
  moneda!: string;

  /**
   * Same `categoria_id` column as a plain property — inserts set the
   * id without loading the `Categoria`; the relation adds the real FK.
   */
  @Column({ name: 'categoria_id', type: 'uuid' })
  categoriaId!: string;

  @ManyToOne(() => CategoriaOrmEntity)
  @JoinColumn({ name: 'categoria_id' })
  categoria!: CategoriaOrmEntity;
}
