// Corre las migraciones contra dist/ compilado y termina el proceso
// explicitamente (exit 0/1). Necesario porque invocar el CLI de TypeORM
// directo (node ./node_modules/typeorm/cli.js ... migration:run) deja el
// pool de Postgres abierto y el proceso nunca sale solo — el "&&" del
// comando de arranque se queda esperando para siempre y el contenedor
// nunca llega a levantar la app (healthcheck falla por timeout, sin error
// visible: la migracion ya habia terminado bien).
const { AppDataSource } = require('../dist/config/data-source');

async function main() {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  await AppDataSource.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error corriendo migraciones:', err);
  process.exit(1);
});
