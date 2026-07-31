import { MigrationInterface, QueryRunner } from "typeorm";

export class TipoOperativoGenerico1785460184016 implements MigrationInterface {
    name = 'TipoOperativoGenerico1785460184016'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."puntos_residuo_tipooperativo_enum" AS ENUM('PUNTO_ACUMULACION', 'GENERICO')`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "tipoOperativo" "public"."puntos_residuo_tipooperativo_enum" NOT NULL DEFAULT 'PUNTO_ACUMULACION'`);
        await queryRunner.query(`CREATE INDEX "IDX_puntos_residuo_tipoOperativo" ON "puntos_residuo" ("tipoOperativo")`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "puntosCriticosEmergentesAtendidos" integer`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "comparendosPedagogicos" integer`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "comparendos" integer`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "personasSensibilizadas" integer`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "huertas" integer`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "kgMaterialResiduosRecolectados" double precision`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "m2RecuperadosEspacioPublico" double precision`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "m2RecuperadosEspacioPublico"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "kgMaterialResiduosRecolectados"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "huertas"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "personasSensibilizadas"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "comparendos"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "comparendosPedagogicos"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "puntosCriticosEmergentesAtendidos"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_puntos_residuo_tipoOperativo"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "tipoOperativo"`);
        await queryRunner.query(`DROP TYPE "public"."puntos_residuo_tipooperativo_enum"`);
    }

}
