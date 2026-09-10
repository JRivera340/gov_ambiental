import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBitacoraToPuntoResiduo1788100000000 implements MigrationInterface {
    name = 'AddBitacoraToPuntoResiduo1788100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "bitacora" jsonb NOT NULL DEFAULT '[]'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "bitacora"`);
    }

}
