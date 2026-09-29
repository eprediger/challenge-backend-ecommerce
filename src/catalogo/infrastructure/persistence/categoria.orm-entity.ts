import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Referenced by `Producto` by id — independent lifecycle.
 */
@Entity({ name: 'categoria' })
export class CategoriaOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  nombre!: string;
}
