import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('punto_asignacion')
export class PuntoAsignacion {
  @PrimaryColumn({ type: 'uuid' })
  puntoResiduoId!: string;

  @Column({ type: 'uuid', nullable: true, default: null })
  gestorId!: string | null;

  @Column({ type: 'uuid', nullable: true, default: null })
  updatedByUserId!: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
