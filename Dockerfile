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
COPY package*.json ./
EXPOSE 3001
# Migracion antes de arrancar: si falla, el contenedor no arranca (mejor
# caido que sirviendo contra un esquema viejo). Usa dist/, no requiere
# ts-node ni el codigo fuente en esta imagen.
CMD ["sh", "-c", "npm run migration:run:dist && node dist/main"]
