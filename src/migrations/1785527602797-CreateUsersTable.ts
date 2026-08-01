import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsersTable1785527602797 implements MigrationInterface {
    name = 'CreateUsersTable1785527602797'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "lastname" character varying NOT NULL, "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "role" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_users_email" UNIQUE ("email"), CONSTRAINT "PK_users_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_users_email"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
