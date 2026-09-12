import { MigrationInterface, QueryRunner } from "typeorm";
import { randomUUID } from "crypto";

export class AddBitacoraActoresToPuntoResiduo1788200000000 implements MigrationInterface {
    name = 'AddBitacoraActoresToPuntoResiduo1788200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "puntos_residuo" ADD "bitacoraActores" jsonb NOT NULL DEFAULT '[]'`);

        // Migrar las entradas viejas de `bitacora` (lista plana, sin agrupar)
        // a `bitacoraActores` (agrupadas por actor). `bitacora` no se toca ni
        // se borra, queda deprecada in situ.
        const filas: Array<{ id: string; bitacora: any[] }> = await queryRunner.query(
            `SELECT id, bitacora FROM puntos_residuo WHERE jsonb_array_length(bitacora) > 0`,
        );

        for (const fila of filas) {
            const grupos = new Map<string, any[]>();
            for (const entry of fila.bitacora || []) {
                const clave = (entry.cedula?.trim() || entry.nombrePersona?.trim() || '').toLowerCase();
                if (!grupos.has(clave)) grupos.set(clave, []);
                grupos.get(clave)!.push(entry);
            }

            const bitacoraActores = Array.from(grupos.values()).map((entradas) => {
                const ultima = entradas[entradas.length - 1];
                return {
                    id: randomUUID(),
                    tipoActor: 'PERSONA',
                    nombre: ultima.nombrePersona || '',
                    cedulaNit: ultima.cedula || '',
                    direccion: ultima.direccion || '',
                    estado: 'IDENTIFICADO',
                    eventos: entradas.map((entrada: any) => ({
                        id: randomUUID(),
                        fecha: combinarFechaHora(entrada.fecha, entrada.hora),
                        tipoResiduo: entrada.tipoResiduo || '',
                        actividadObservada: 'OTRO',
                        cantidadAproximada: '',
                        descripcion: '',
                        evidenciaTipos: [],
                        evidenciaArchivos: [],
                        numeroEvidencias: 0,
                        autorId: entrada.autorId || '',
                        autorNombre: entrada.autorNombre || '',
                    })),
                };
            });

            await queryRunner.query(
                `UPDATE puntos_residuo SET "bitacoraActores" = $1 WHERE id = $2`,
                [JSON.stringify(bitacoraActores), fila.id],
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "puntos_residuo" DROP COLUMN "bitacoraActores"`);
    }

}

function combinarFechaHora(fechaISO: string, hora?: string): string {
    const base = new Date(fechaISO);
    if (hora && /^\d{2}:\d{2}/.test(hora)) {
        const [h, m] = hora.split(':').map(Number);
        base.setUTCHours(h, m, 0, 0);
    }
    return base.toISOString();
}
