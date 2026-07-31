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
# Migracion antes de arrancar: si falla, el contenedor no arranca (mejor
# caido que sirviendo contra un esquema viejo). Usa dist/, no requiere
# ts-node ni el codigo fuente en esta imagen. El codigo de salida se imprime
# explicitamente (diagnostico temporal: node dist/main no llegaba a arrancar
# tras la migracion y no habia forma de ver por que).
CMD ["sh", "-c", "npm run migration:run:dist; code=$?; echo \"[DEPLOY] migration:run:dist exit code: $code\"; if [ \"$code\" -ne 0 ]; then exit \"$code\"; fi; echo \"[DEPLOY] arrancando node dist/main\"; exec node dist/main"]
