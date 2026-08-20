import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDatosFormularioToPuntoResiduo1787260000000 implements MigrationInterface {
    name = 'AddDatosFormularioToPuntoResiduo1787260000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "datosFormulario" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "datosFormulario"`);
    }

}
