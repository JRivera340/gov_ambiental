# API

Todos los endpoints están bajo el prefijo `/api`. Todas las respuestas son
JSON. Los endpoints protegidos requieren el header
`Authorization: Bearer <token>` (obtenido en `POST /api/auth/login`); si
falta o es inválido, responden `401 Unauthorized`. Si el rol del token no
está autorizado para ese endpoint, responden `403 Forbidden`.

## Autenticación

### `POST /api/auth/login`
Sin autenticación previa (es el propio login).

**Body**: `{ "email": string, "password": string }`

**Respuesta 200**: `{ "accessToken": string, "user": { id, name, lastname, email, role } }`

**Respuesta 401**: credenciales inválidas o usuario desactivado.

---

## Usuarios (`/api/users`)

| Método y ruta | Roles | Descripción |
|---|---|---|
| `GET /users/gestores/list` | Gestor, Validador, Admin | Lista de usuarios activos (gestores, validadores, admins) — para selectores de "asignar a" |
| `GET /users` | Admin | Lista completa de usuarios (activos e inactivos) |
| `GET /users/:id` | Gestor, Validador, Admin | Un usuario por id |
| `POST /users` | Admin | Crea un usuario. Body: `{ name, lastname, email, password, role }` |
| `PATCH /users/:id` | Admin | Edita un usuario. Body (todos opcionales): `{ name?, lastname?, email?, role?, password? }` — sin `password`, la contraseña no cambia |
| `PATCH /users/:id/desactivar` | Admin | Desactiva un usuario (no puede volver a iniciar sesión) |
| `PATCH /users/:id/activar` | Admin | Reactiva un usuario |

Ninguna respuesta de este recurso incluye `passwordHash`.

---

## Puntos de acumulación (`/api/puntos`)

| Método y ruta | Roles | Descripción |
|---|---|---|
| `POST /puntos` | Gestor | Crea un punto nuevo, en estado `BORRADOR`. Body: ver `create-punto.dto.ts` / `DICCIONARIO-DATOS.md` |
| `GET /puntos/mine` | Gestor, Admin | Puntos creados por el usuario autenticado |
| `GET /puntos` | Gestor, Validador, Admin | Todos los puntos. Query opcional: `desde`, `hasta` (fechas ISO, filtran por `dateTime`) |
| `GET /puntos/pending` | Validador, Admin | Puntos en estado `ENVIADA` |
| `GET /puntos/public/:id` | **Público** (sin token) | Detalle de un punto publicado, para consulta ciudadana |
| `GET /puntos/report-xlsx` | Gestor, Validador, Admin | Descarga un Excel con los puntos publicados pendientes de recolección |
| `GET /puntos/:id` | Gestor, Validador, Admin | Detalle de un punto |
| `PATCH /puntos/:id` | Gestor (solo el propio, en `BORRADOR`/`RECHAZADA`), Validador (solo `ENVIADA`), Admin (cualquier estado) | Edita un punto |
| `POST /puntos/:id/send` | Gestor | Pasa el punto de `BORRADOR`/`RECHAZADA` a `ENVIADA` |
| `POST /puntos/:id/approve` | Validador, Admin | Aprueba y publica el punto (pasa a `PUBLICADA`) |
| `POST /puntos/:id/reject` | Validador, Admin | Rechaza el punto. Body: `{ "notes": string }` (obligatorio) |
| `PATCH /puntos/:id/seguimiento` | Gestor, Validador, Admin | Marca un residuo como recogido o agrega un residuo nuevo. Body: `{ action: 'MARCAR_RECOGIDO' \| 'AGREGAR_RESIDUO', ... }` |
| `POST /puntos/:id/residuo-nota` | Gestor, Admin | Agrega una nota de seguimiento a un residuo. Body: `{ residuoId, texto }` |
| `DELETE /puntos/:id/residuo-nota` | Gestor, Admin | Elimina una nota. Body: `{ residuoId, notaId }` |
| `POST /puntos/merge` | Gestor, Validador, Admin | Fusiona residuos de varios puntos hijos en un punto padre. Body: `{ parentId, childIds }` |
| `PATCH /puntos/:id/aprobar-residuo` | Validador, Admin | Aprueba residuos puntuales dentro de un punto (subtipo `GENERICO`) |

---

## Asignaciones (`/api/asignaciones`)

| Método y ruta | Roles | Descripción |
|---|---|---|
| `GET /asignaciones/mine` | Gestor, Admin | Puntos asignados al usuario autenticado |
| `GET /asignaciones/all` | Admin | Todas las asignaciones |
| `GET /asignaciones/sin-asignar` | Admin | Puntos sin gestor asignado |
| `PATCH /asignaciones/punto` | Admin | Asigna/reasigna un punto. Body: `{ puntoResiduoId, gestorId }` |

---

## Procesos (`/api/procesos`)

| Método y ruta | Roles | Descripción |
|---|---|---|
| `POST /procesos` | Gestor | Crea un proceso |
| `GET /procesos/mine` | Gestor | Procesos creados por el usuario |
| `GET /procesos/all` | Gestor, Admin | Todos los procesos |
| `GET /procesos/:id` | Gestor, Admin | Detalle de un proceso |
| `PATCH /procesos/:id` | Gestor | Edita un proceso |
| `DELETE /procesos/:id` | Gestor, Admin | Elimina un proceso |

---

## Rutas semanales (`/api/rutas-semanales`)

| Método y ruta | Roles | Descripción |
|---|---|---|
| `GET /rutas-semanales/mine` | Gestor, Admin | Ruta de la semana actual del usuario |
| `GET /rutas-semanales/arrastre/mine` | Gestor, Admin | Puntos arrastrados de la semana anterior (no visitados) |
| `POST /rutas-semanales` | Gestor, Admin | Crea la ruta de la semana |
| `PATCH /rutas-semanales/:id/cancelar` | Gestor, Admin | Cancela una ruta |

---

## Sectores (`/api/sectores`)

| Método y ruta | Roles | Descripción |
|---|---|---|
| `GET /sectores/puntos` | Gestor, Validador, Admin | Puntos agrupados por sector de recolección (parseo de KMZ) |
| `PATCH /sectores/marcar-recogido-masivo` | Gestor, Validador, Admin | Marca varios residuos como recogidos de una vez |

---

## Catálogos (`/api/catalogs`) — sin restricción de rol (requieren sesión válida, cualquier rol)

| Método y ruta | Descripción |
|---|---|
| `GET /catalogs/barrios` | Lista de barrios de la localidad Santa Fe |
| `GET /catalogs/tipos-actividad` | Tipos de actividad disponibles |
| `GET /catalogs/entidades` | Entidades responsables disponibles |
| `GET /catalogs/all` | Los tres catálogos anteriores en una sola respuesta |

---

## Archivos (`/api/files`)

| Método y ruta | Roles | Descripción |
|---|---|---|
| `GET /files/raw/*key` | **Público** (sin token) | Descarga un archivo cuando `STORAGE_DRIVER=local`. Un `<img>` no puede mandar `Authorization`, por eso es público — equivalente a una URL pública de S3 |
| `POST /files/acta` | Gestor, Validador, Admin | Sube un PDF (multipart, campo `file`). Body adicional: `activityId` (opcional, agrupa el archivo bajo esa carpeta) |
| `POST /files/photos` | Gestor, Validador, Admin | Sube hasta 5 fotos (multipart, campo `files`). Body adicional: `activityId` (opcional) |
| `GET /files/:key` | Gestor, Validador, Admin | Devuelve `{ url }` — la URL pública o firmada para descargar esa clave |

---

## Otros

| Método y ruta | Descripción |
|---|---|
| `GET /` (sin prefijo `/api`) | Identifica el servicio (`{ service, version, status }`) |
| `GET /api/health` | `200 OK` si el proceso está vivo |

Ver `ROLES-PERMISOS.md` para el detalle de qué significa cada rol en
términos funcionales.
