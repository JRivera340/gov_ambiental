# Dependencias y licencias

Todas las dependencias directas (no transitivas) declaradas en
`package.json` (backend) y `frontend/package.json` (frontend), con su
versión y licencia real (leída del propio paquete instalado, no de
memoria).

**Ninguna dependencia exige pago de licencia.** Una sí tiene una condición de
uso más allá de lo habitual en código abierto — marcada explícitamente
abajo.

## ⚠️ Atención: `react-leaflet` (Hippocratic License 2.1)

`react-leaflet` (usado para los mapas del frontend) está licenciado bajo la
**Hippocratic License 2.1**, no una licencia de código abierto tradicional.
Es una licencia permisiva similar a MIT pero que **agrega restricciones de
uso ético** (prohíbe usar el software de formas que violen derechos humanos
reconocidos internacionalmente). Es gratuita y sin costo, pero no es
"código abierto" en el sentido estricto de OSI — vale la pena que quien
revise aspectos legales de la entrega lo tenga en cuenta.

## Backend (`package.json`)

| Paquete | Versión | Licencia |
|---|---|---|
| @aws-sdk/client-s3 | ^3.700.0 | Apache-2.0 |
| @aws-sdk/s3-request-presigner | ^3.700.0 | Apache-2.0 |
| @mapbox/togeojson | ^0.16.2 | BSD-2-Clause |
| @nestjs/common | ^11.0.1 | MIT |
| @nestjs/core | ^11.0.1 | MIT |
| @nestjs/jwt | ^11.0.2 | MIT |
| @nestjs/passport | ^11.0.5 | MIT |
| @nestjs/platform-express | ^11.0.1 | MIT |
| @nestjs/typeorm | ^11.0.0 | MIT |
| @xmldom/xmldom | ^0.9.10 | MIT |
| bcrypt | ^6.0.0 | MIT |
| class-transformer | ^0.5.1 | MIT |
| class-validator | ^0.14.3 | MIT |
| dotenv | ^17.2.3 | BSD-2-Clause |
| helmet | ^8.1.0 | MIT |
| jsonwebtoken | ^9.0.2 | MIT |
| jszip | ^3.10.1 | MIT o GPL-3.0 (dual, se usa bajo MIT) |
| passport | ^0.7.0 | MIT |
| passport-jwt | ^4.0.1 | MIT |
| pg | ^8.16.3 | MIT |
| reflect-metadata | ^0.2.2 | Apache-2.0 |
| rxjs | ^7.8.1 | Apache-2.0 |
| typeorm | ^0.3.28 | MIT |
| xlsx (SheetJS) | ^0.18.5 | Apache-2.0 |
| zod | ^4.2.1 | MIT |

### Desarrollo (backend)

| Paquete | Versión | Licencia |
|---|---|---|
| @nestjs/cli | ^11.0.0 | MIT |
| @nestjs/schematics | ^11.0.0 | MIT |
| @nestjs/testing | ^11.0.1 | MIT |
| jest | ^30.0.0 | MIT |
| ts-jest | ^29.2.5 | MIT |
| ts-node | ^10.9.2 | MIT |
| tsconfig-paths | ^4.2.0 | MIT |
| typescript | ^5.7.3 | Apache-2.0 |
| (más los paquetes `@types/*`, todos MIT) | | |

## Frontend (`frontend/package.json`)

| Paquete | Versión | Licencia |
|---|---|---|
| @mapbox/togeojson | ^0.16.0 | BSD-2-Clause |
| axios | ^1.7.9 | MIT |
| class-variance-authority | ^0.7.1 | Apache-2.0 |
| clsx | ^2.1.1 | MIT |
| date-fns | ^4.1.0 | MIT |
| jszip | ^3.10.1 | MIT o GPL-3.0 (dual, se usa bajo MIT) |
| leaflet | ^1.9.4 | BSD-2-Clause |
| lucide-react | ^0.575.0 | ISC |
| react | ^18.3.1 | MIT |
| react-dom | ^18.3.1 | MIT |
| react-hook-form | ^7.54.2 | MIT |
| **react-leaflet** | ^4.2.1 | **Hippocratic-2.1** — ver nota arriba |
| react-router-dom | ^7.1.3 | MIT |
| tailwind-merge | ^3.5.0 | MIT |
| xlsx (SheetJS) | ^0.18.5 | Apache-2.0 |
| zustand | ^5.0.2 | MIT |

### Desarrollo (frontend)

| Paquete | Versión | Licencia |
|---|---|---|
| vite | ^7.2.4 | MIT |
| vitest | ^4.1.9 | MIT |
| tailwindcss | ^3.4.17 | MIT |
| eslint | ^9.39.5 | MIT |
| typescript | ~5.9.3 | Apache-2.0 |
| playwright | ^1.62.0 | Apache-2.0 |
| @testing-library/react | ^16.3.2 | MIT |
| (más los paquetes `@types/*` y plugins de eslint/vite, todos MIT) | | |

## Infraestructura (no es código del proyecto, pero forma parte de la entrega)

| Componente | Licencia |
|---|---|
| PostgreSQL 16 (imagen `postgres:16-alpine`) | PostgreSQL License (permisiva, tipo BSD) |
| nginx (imagen `nginx:1.27-alpine`) | BSD-2-Clause |
| Node.js 20 (imagen `node:20-alpine`) | MIT (con componentes bajo otras licencias permisivas) |
