import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1785238458998 implements MigrationInterface {
    name = 'InitialSchema1785238458998'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."puntos_residuo_status_enum" AS ENUM('BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'PUBLICADA')`);
        await queryRunner.query(`CREATE TABLE "puntos_residuo" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdByUserId" uuid NOT NULL, "status" "public"."puntos_residuo_status_enum" NOT NULL DEFAULT 'BORRADOR', "dateTime" TIMESTAMP WITH TIME ZONE NOT NULL, "lat" double precision NOT NULL, "lng" double precision NOT NULL, "barrio" character varying NOT NULL, "photos" text array NOT NULL DEFAULT '{}', "photosFase2" text array, "fechaFinalizacion" TIMESTAMP WITH TIME ZONE, "actaPdfUrl" text, "results" text, "entidadResponsable" text, "entidadesAcompanantes" text array, "isGroupOperativo" boolean NOT NULL DEFAULT false, "gestoresInvolucradosIds" uuid array, "validatorUserId" uuid, "validatedAt" TIMESTAMP WITH TIME ZONE, "validationNotes" text, "publishedAt" TIMESTAMP WITH TIME ZONE, "processId" uuid, "descripcionAntes" text, "descripcionDespues" text, "revisadoPorUserId" uuid, "revisadoPorNombre" character varying, "fechaRevision" TIMESTAMP WITH TIME ZONE, "pointNumber" integer, "categorySeq" integer, "residuos" jsonb NOT NULL DEFAULT '[]', "ultimoSeguimientoAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c1e0d28cc1f342963b25ed46fab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_dbb6fa88f08537e4c92df9bf7e" ON "puntos_residuo" ("createdByUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_563c5a85d9d29c1e4019603a19" ON "puntos_residuo" ("dateTime") `);
        await queryRunner.query(`CREATE INDEX "IDX_bdff007e72d32a92ecf6c468c7" ON "puntos_residuo" ("barrio") `);
        await queryRunner.query(`CREATE INDEX "IDX_ddf6e41794e9fdabaad44f4fc8" ON "puntos_residuo" ("processId") `);
        await queryRunner.query(`CREATE INDEX "IDX_a8c6d43b2af8e0a54babc206e1" ON "puntos_residuo" ("pointNumber") `);
        await queryRunner.query(`CREATE TYPE "public"."procesos_status_enum" AS ENUM('ACTIVO', 'EN_SEGUIMIENTO', 'FINALIZADO')`);
        await queryRunner.query(`CREATE TABLE "procesos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(255) NOT NULL, "descripcion" text, "createdByUserId" uuid NOT NULL, "status" "public"."procesos_status_enum" NOT NULL DEFAULT 'ACTIVO', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6551b325413e0f924ed347eb04e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4c69fb95865533d66d9f8d8016" ON "procesos" ("createdByUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_4dd70a5c800a9590e680cd42bf" ON "procesos" ("status") `);
        await queryRunner.query(`CREATE TABLE "punto_asignacion" ("puntoResiduoId" uuid NOT NULL, "gestorId" uuid, "updatedByUserId" uuid, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a12286a006a4819d52b371033ed" PRIMARY KEY ("puntoResiduoId"))`);
        await queryRunner.query(`CREATE TABLE "ruta_semanal" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "gestorId" uuid NOT NULL, "semanaInicio" TIMESTAMP WITH TIME ZONE NOT NULL, "semanaFin" TIMESTAMP WITH TIME ZONE NOT NULL, "estado" character varying NOT NULL DEFAULT 'en_progreso', "paradas" jsonb NOT NULL DEFAULT '[]', "segmentos" jsonb NOT NULL DEFAULT '[]', "arrastre" jsonb NOT NULL DEFAULT '[]', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d56a7e9d8e6243f8e07e2bc6f74" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_76d93c7dd2afb397b166b38e19" ON "ruta_semanal" ("gestorId", "semanaInicio") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_76d93c7dd2afb397b166b38e19"`);
        await queryRunner.query(`DROP TABLE "ruta_semanal"`);
        await queryRunner.query(`DROP TABLE "punto_asignacion"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4dd70a5c800a9590e680cd42bf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4c69fb95865533d66d9f8d8016"`);
        await queryRunner.query(`DROP TABLE "procesos"`);
        await queryRunner.query(`DROP TYPE "public"."procesos_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a8c6d43b2af8e0a54babc206e1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ddf6e41794e9fdabaad44f4fc8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bdff007e72d32a92ecf6c468c7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_563c5a85d9d29c1e4019603a19"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dbb6fa88f08537e4c92df9bf7e"`);
        await queryRunner.query(`DROP TABLE "puntos_residuo"`);
        await queryRunner.query(`DROP TYPE "public"."puntos_residuo_status_enum"`);
    }

}
