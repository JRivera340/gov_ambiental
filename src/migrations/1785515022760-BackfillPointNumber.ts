import { MigrationInterface, QueryRunner } from "typeorm";

// Rellena "pointNumber" en los puntos de acumulacion migrados del hub
// (HITO 3) que quedaron en NULL — nunca pasaron por PuntosService.create(),
// que es donde se asigna el numero, asi que no lo tenian. Mismo algoritmo
// que create() y que el hub: menor entero positivo no usado (llena huecos).
// Se asigna en orden de dateTime ascendente para que el orden de numeros
// tenga sentido cronologico. Ver ESTADO-EXTRACCION.md, hallazgo del
// recorrido visual 2026-08-01.
export class BackfillPointNumber1785515022760 implements MigrationInterface {
    name = 'BackfillPointNumber1785515022760'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const usedRows: { num: string }[] = await queryRunner.query(
            `SELECT "pointNumber" AS num FROM "puntos_residuo" WHERE "pointNumber" IS NOT NULL AND "pointNumber" > 0`,
        );
        const used = new Set(usedRows.map((r) => parseInt(r.num, 10)).filter((n) => !isNaN(n)));

        const sinNumero: { id: string }[] = await queryRunner.query(
            `SELECT id FROM "puntos_residuo" WHERE "tipoOperativo" = 'PUNTO_ACUMULACION' AND "pointNumber" IS NULL ORDER BY "dateTime" ASC`,
        );

        let candidato = 1;
        for (const row of sinNumero) {
            while (used.has(candidato)) candidato++;
            used.add(candidato);
            await queryRunner.query(`UPDATE "puntos_residuo" SET "pointNumber" = $1 WHERE id = $2`, [candidato, row.id]);
        }
    }

    public async down(): Promise<void> {
        // Irreversible a propósito: no hay forma de saber cuáles pointNumber
        // fueron asignados por esta migración vs. ya existían antes, y
        // volver a NULL rompería referencias ya mostradas al usuario.
    }

}
