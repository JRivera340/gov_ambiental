FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/scripts/run-migrations-dist.js ./scripts/run-migrations-dist.js
COPY package*.json ./
EXPOSE 3001
# Migracion automatica en el arranque REVERTIDA 2026-07-31: 4 intentos
# distintos (CLI directo, script propio con destroy(), sin destroy(), con
# diagnostico de codigo de salida) rompieron el healthcheck sin que los logs
# mostraran una causa clara — ni el echo de diagnostico llegaba a imprimirse,
# senal de que el problema esta en como Railway ejecuta este CMD/startCommand,
# no en el script en si. La migracion pendiente (TipoOperativoGenerico) ya
# corrio y quedo comprometida en produccion (confirmado en logs: CREATE TYPE,
# ALTER TABLE, COMMIT) antes de que el contenedor de ese intento muriera, asi
# que no bloquea este revert. Migraciones futuras: correr a mano con
# "npm run migration:run:dist" (requiere DB_HOST/DB_PORT del proxy publico,
# no el hostname interno, si se corre fuera de la red de Railway). Pendiente
# de investigar con mas tiempo/acceso interactivo — ver RESUMEN-NOCHE.md.
CMD ["node", "dist/main"]
