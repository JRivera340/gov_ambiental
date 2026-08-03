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
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=build /app/boundaries ./boundaries
COPY package*.json ./
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3001
# Corre las migraciones pendientes y luego arranca el backend. Este entrypoint
# ya se intentó automatizar antes en Railway (ver DEUDA-TECNICA.md, si existe
# en esta rama) sin éxito por un problema propio de cómo Railway ejecuta su
# CMD/startCommand — en un contenedor Docker plano (este entregable) no aplica
# esa limitación, así que sí se automatiza acá.
ENTRYPOINT ["./docker-entrypoint.sh"]
