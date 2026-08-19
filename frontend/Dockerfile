FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Railway inyecta las variables del servicio como build-args, pero Docker
# las ignora salvo que el Dockerfile las declare explicitamente — sin esto,
# vite build corria con import.meta.env.VITE_AMBIENTAL_API_URL vacio y el
# frontend terminaba pegandole a si mismo (nginx) en vez del backend.
ARG VITE_AMBIENTAL_API_URL
ENV VITE_AMBIENTAL_API_URL=$VITE_AMBIENTAL_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
