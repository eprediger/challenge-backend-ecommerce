import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { VarianteOrmEntity } from './variante.orm-entity';

/**
 * An `AtributoVariante` value object has no identity of its own, so
 * no surrogate id: the composite PK (`variante_id`, `nombre`) is also
 * the uniqueness backstop for attribute names within a variante.
 */
@Entity({ name: 'atributo_variante' })
export class AtributoVarianteOrmEntity {
  @PrimaryColumn({ name: 'variante_id', type: 'uuid' })
  varianteId!: string;

  @PrimaryColumn({ name: 'nombre', type: 'text' })
  nombre!: string;

  @Column({ type: 'text' })
  valor!: string;

  @ManyToOne(() => VarianteOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variante_id' })
  variante!: VarianteOrmEntity;
}
