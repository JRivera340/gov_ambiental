FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# VITE_AMBIENTAL_API_URL se hornea en el bundle en build-time (Vite), no se
# puede cambiar despues en runtime sin reconstruir la imagen — ver
# docker-compose.yml (build.args) y .env.example.
ARG VITE_AMBIENTAL_API_URL=http://localhost:3001
ENV VITE_AMBIENTAL_API_URL=$VITE_AMBIENTAL_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
