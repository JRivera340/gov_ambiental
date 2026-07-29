import { MigrationInterface, QueryRunner } from "typeorm";

export class FormularioFijoPuntoAcumulacion1785339722226 implements MigrationInterface {
    name = 'FormularioFijoPuntoAcumulacion1785339722226'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."puntos_residuo_frecuenciaacumulacion_enum" AS ENUM('PRIMERA_VEZ', 'OCASIONAL', 'FRECUENTE', 'PERMANENTE')`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "frecuenciaAcumulacion" "public"."puntos_residuo_frecuenciaacumulacion_enum"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "observaciones" text`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "entornoEscolar" boolean`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "nombreEntornoEscolar" character varying`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "especificarEntorno" character varying`);
        await queryRunner.query(`CREATE TYPE "public"."puntos_residuo_tipozona_enum" AS ENUM('RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'MIXTA', 'OTRA')`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "tipoZona" "public"."puntos_residuo_tipozona_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."puntos_residuo_tiposuelo_enum" AS ENUM('ANDEN', 'CALLE', 'SEPARADOR', 'PARQUE', 'OTRO')`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "tipoSuelo" "public"."puntos_residuo_tiposuelo_enum"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "condicionesZona" text array`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "poblacionHabitanteCalle" boolean`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "factoresAcumulacion" text array`);
        await queryRunner.query(`CREATE TYPE "public"."puntos_residuo_camaraspunto_enum" AS ENUM('NO_HAY', 'FUNCIONAMIENTO', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO')`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "camarasPunto" "public"."puntos_residuo_camaraspunto_enum"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "operadorAseo" character varying`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "recoleccionPuertaAPuerta" boolean`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "m2Invasion" double precision`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "actoresIndisciplina" text`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "intervencionesPropuestas" text`);
        await queryRunner.query(`CREATE TYPE "public"."puntos_residuo_identificaciongenerador_enum" AS ENUM('SI', 'NO', 'PARCIALMENTE')`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "identificacionGenerador" "public"."puntos_residuo_identificaciongenerador_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."puntos_residuo_tipogenerador_enum" AS ENUM('COMUNIDAD', 'VIVIENDA', 'RESTAURANTE', 'BAR', 'TIENDA', 'SUPERMERCADO', 'PLAZA_MERCADO', 'OBRA_CONSTRUCCION', 'EMPRESA', 'TALLER', 'HABITANTE_CALLE', 'RECICLADOR', 'VOLQUETA', 'OTRO')`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "tipoGenerador" "public"."puntos_residuo_tipogenerador_enum"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "nombreResponsable" character varying`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "direccionResponsable" character varying`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "observoDisposicion" boolean`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "fechaObservacion" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`CREATE TYPE "public"."puntos_residuo_metodoidentificacion_enum" AS ENUM('OBSERVACION_DIRECTA', 'INFO_COMUNIDAD', 'CAMARAS', 'FOTOGRAFIAS', 'DOCUMENTACION_RESIDUOS', 'INFO_OPERADOR_ASEO', 'OTRO')`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "metodoIdentificacion" "public"."puntos_residuo_metodoidentificacion_enum"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "actoresEstrategicos" text array`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "telefonoActor" character varying`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "intervencionesRecomendadas" text array`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "intervencionesRecomendadas"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "telefonoActor"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "actoresEstrategicos"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "metodoIdentificacion"`);
        await queryRunner.query(`DROP TYPE "public"."puntos_residuo_metodoidentificacion_enum"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "fechaObservacion"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "observoDisposicion"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "direccionResponsable"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "nombreResponsable"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "tipoGenerador"`);
        await queryRunner.query(`DROP TYPE "public"."puntos_residuo_tipogenerador_enum"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "identificacionGenerador"`);
        await queryRunner.query(`DROP TYPE "public"."puntos_residuo_identificaciongenerador_enum"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "intervencionesPropuestas"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "actoresIndisciplina"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "m2Invasion"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "recoleccionPuertaAPuerta"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "operadorAseo"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "camarasPunto"`);
        await queryRunner.query(`DROP TYPE "public"."puntos_residuo_camaraspunto_enum"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "factoresAcumulacion"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "poblacionHabitanteCalle"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "condicionesZona"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "tipoSuelo"`);
        await queryRunner.query(`DROP TYPE "public"."puntos_residuo_tiposuelo_enum"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "tipoZona"`);
        await queryRunner.query(`DROP TYPE "public"."puntos_residuo_tipozona_enum"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "especificarEntorno"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "nombreEntornoEscolar"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "entornoEscolar"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "observaciones"`);
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "frecuenciaAcumulacion"`);
        await queryRunner.query(`DROP TYPE "public"."puntos_residuo_frecuenciaacumulacion_enum"`);
    }

}
