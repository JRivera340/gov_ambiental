import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateVisitasPuntoTable1785700000000 implements MigrationInterface {
    name = 'CreateVisitasPuntoTable1785700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "visitas_punto" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "puntoResiduoId" uuid NOT NULL, "gestorId" uuid NOT NULL, "fecha" TIMESTAMP WITH TIME ZONE NOT NULL, "semanaISO" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_visitas_punto_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_visitas_punto_puntoResiduoId" ON "visitas_punto" ("puntoResiduoId")`);
        await queryRunner.query(`CREATE INDEX "IDX_visitas_punto_gestorId" ON "visitas_punto" ("gestorId")`);
        await queryRunner.query(`CREATE INDEX "IDX_visitas_punto_gestorId_semanaISO" ON "visitas_punto" ("gestorId", "semanaISO")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_visitas_punto_gestorId_semanaISO"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_visitas_punto_gestorId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_visitas_punto_puntoResiduoId"`);
        await queryRunner.query(`DROP TABLE "visitas_punto"`);
    }

}
