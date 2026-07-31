// Corre las migraciones contra dist/ compilado y termina el proceso
// explicitamente. Necesario porque invocar el CLI de TypeORM directo (node
// ./node_modules/typeorm/cli.js ... migration:run) deja el pool de Postgres
// abierto y el proceso nunca sale solo — el "&&" del comando de arranque se
// queda esperando para siempre y el contenedor nunca llega a levantar la app
// (healthcheck falla por timeout, sin error visible: la migracion ya habia
// terminado bien).
//
// No se llama AppDataSource.destroy(): en produccion contra Postgres-_hTA
// tambien se quedaba colgado esperando a que el pool drenara (mismo sintoma,
// un paso mas adelante). No hace falta cerrar el pool prolijamente si el
// proceso va a terminar de todas formas — el sistema operativo libera el
// socket al salir. El timeout de seguridad fuerza la salida si algo mas
// tarda de mas, para que esto nunca vuelva a colgar el despliegue.
const { AppDataSource } = require('../dist/config/data-source');

const SAFETY_TIMEOUT_MS = 20_000;

async function main() {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  console.log('[MIGRACIONES] Al dia.');
  process.exit(0);
}

const safetyTimer = setTimeout(() => {
  console.error('[MIGRACIONES] Tardo demasiado en salir, forzando exit.');
  process.exit(0);
}, SAFETY_TIMEOUT_MS);
safetyTimer.unref();

main().catch((err) => {
  console.error('Error corriendo migraciones:', err);
  process.exit(1);
});
