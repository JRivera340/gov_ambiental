import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn,
} from 'typeorm';

// Historial de visitas de un gestor a un punto. Append-only a propósito: no
// hay unique constraint por (puntoResiduoId, gestorId, semanaISO) — un
// gestor puede visitar el mismo punto varias veces en la semana, y eso es
// información válida (no solo "visitado si/no"). "¿Se visitó esta semana?"
// se deriva con COUNT(*) > 0 sobre esta tabla filtrada por semanaISO.
@Entity('visitas_punto')
@Index(['gestorId', 'semanaISO'])
export class VisitaPunto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  puntoResiduoId!: string;

  @Column({ type: 'uuid' })
  @Index()
  gestorId!: string;

  @Column({ type: 'timestamptz' })
  fecha!: Date;

  // Semana ISO en formato 'YYYY-Www' (ej '2026-W33'), calculada al insertar
  // a partir de `fecha` — evita recalcular semana ISO en cada consulta de
  // agregado y hace los índices por semana triviales.
  @Column({ type: 'varchar' })
  semanaISO!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
