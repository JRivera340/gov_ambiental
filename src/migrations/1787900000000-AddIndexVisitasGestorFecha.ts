import { MigrationInterface, QueryRunner } from "typeorm";

// El desempeño pasó a contar visitas por rango de fechas (ver
// VisitasService.getIdsVisitadosEnRango) en vez de por igualdad de semanaISO:
// el índice (gestorId, semanaISO) no sirve para ese filtro.
export class AddIndexVisitasGestorFecha1787900000000 implements MigrationInterface {
    name = 'AddIndexVisitasGestorFecha1787900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_visitas_punto_gestorId_fecha" ON "visitas_punto" ("gestorId", "fecha")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_visitas_punto_gestorId_fecha"`);
    }

}
