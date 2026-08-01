# Manual técnico

## Visión general

El sistema tiene tres piezas, cada una en su propio contenedor Docker:

```
┌─────────────┐      HTTP/JSON       ┌─────────────┐      SQL      ┌─────────────┐
│  Frontend   │ ───────────────────► │   Backend   │ ─────────────► │  Postgres   │
│ React + Vite│  ◄─────────────────  │  NestJS 11  │ ◄───────────── │     16      │
│ (nginx)     │                      │  TypeORM    │                └─────────────┘
└─────────────┘                      └──────┬──────┘
                                             │
                                             ▼
                                      ┌─────────────┐
                                      │  Storage    │
                                      │ (disco local│
                                      │  o S3)      │
                                      └─────────────┘
```

- El **frontend** es una SPA (Single Page Application) construida con Vite,
  servida como archivos estáticos por nginx. Todo el llamado al backend pasa
  por `axios`, con el token JWT guardado en `sessionStorage` (una sesión por
  pestaña del navegador).
- El **backend** es una API REST con NestJS. Autentica con su propio sistema
  de usuarios y JWT (ver más abajo). No depende de ningún sistema externo.
- La **base de datos** es Postgres. El esquema se versiona con migraciones de
  TypeORM (`src/migrations/`), que corren automáticamente al arrancar el
  contenedor del backend.
- El **almacenamiento de archivos** (fotos, actas en PDF) tiene dos modos,
  elegidos por la variable `STORAGE_DRIVER`: `local` (disco, default, sin
  configurar nada externo) o `s3` (cualquier proveedor compatible con S3).

## Estructura del código

```
src/                        # Backend (NestJS)
  auth/                     # Login propio: JWT, guards, decorators
  users/                    # Usuarios: entidad, CRUD, servicio
  puntos/                   # Entidad central: PuntoResiduo (ver MODELO-DATOS.md)
    entities/
    dto/
  procesos/                 # Agrupa puntos en un proceso
  asignaciones/             # PuntoAsignacion — gestor asignado a cada punto
  rutas-semanales/          # Rutas de recolección semanales del gestor
  sectores/                 # Parseo KMZ + panel de sectores de recolección
  catalogos/                # Listas fijas (barrios, entidades, tipos)
  files/                    # Subida/descarga de fotos y actas
  common/enums/             # Role (los 3 roles del sistema)
  config/                   # Variables de entorno, DataSource de TypeORM
  migrations/                # Migraciones versionadas del esquema
scripts/
  seed.ts                   # Datos de prueba (ver README.md)
  run-migrations-dist.js    # Corre las migraciones pendientes y sale
frontend/
  src/
    pages/                  # Una carpeta por rol (gestor-ambiental/, validador/, admin/)
    components/             # Componentes compartidos
    services/                # Clientes HTTP (uno por recurso del backend)
    store/                   # Estado global (Zustand) — sesión del usuario
    config/                  # Configuración de los 26 campos del formulario fijo
```

## Autenticación

Login propio, sin dependencias externas:

1. `POST /api/auth/login` recibe `{ email, password }`, busca el usuario en
   la tabla `users`, compara la contraseña con `bcrypt` contra el hash
   guardado, y si coincide firma un JWT con `{ sub, email, role }` usando
   `JWT_SECRET`.
2. Cada petición protegida manda ese token en `Authorization: Bearer <token>`.
   `JwtStrategy` (Passport) lo verifica y lo decodifica; `RolesGuard` revisa
   que el rol del token esté en la lista de `@Roles(...)` del endpoint.
3. El token expira a las 8 horas. No hay refresh token — al expirar, el
   usuario vuelve a iniciar sesión.

Ver `SEGURIDAD.md` para recomendaciones sobre `JWT_SECRET` en un despliegue
real.

## Modelo de dominio — invariantes importantes

- **`PuntoResiduo`** es la entidad central. Un punto tiene un ciclo de vida
  de 5 estados (`BORRADOR → ENVIADA → APROBADA/RECHAZADA → PUBLICADA`, ver
  `MODELO-DATOS.md`). En la práctica, el endpoint de aprobar salta
  directamente de `ENVIADA` a `PUBLICADA` — `APROBADA` existe en el enum
  pero el flujo normal no pasa por ahí (ver `LIMITACIONES-CONOCIDAS.md`).
- Un punto puede ser de dos subtipos (`tipoOperativo`): `PUNTO_ACUMULACION`
  (el caso principal, con el formulario fijo de 26 campos) o `GENERICO` (un
  operativo ambiental más simple, con contadores en vez de residuos
  detallados). Ambos viven en la misma tabla — comparten el mismo ciclo de
  vida, asignación y validación.
- **`PuntoAsignacion`** vincula un punto con el gestor responsable. Es una
  tabla propia con clave primaria en `puntoResiduoId` (no un campo embebido
  en el punto) — permite reasignar sin tocar la fila del punto.
- Los **residuos** de un punto (tipo, cantidad, fotos, si ya se recogió) no
  son una tabla aparte: viven como un arreglo JSON dentro de la columna
  `residuos` del punto (tipo `jsonb` en Postgres). Igual las notas de
  seguimiento de cada residuo.
- Las **rutas semanales** agrupan las paradas (puntos a visitar) de un
  gestor en una semana calendario. La columna `paradas` es JSON; la lógica
  de cálculo de límites de semana vive en `rutas-semanales/lib/` (funciones
  puras, con sus propios tests).

## Frontend — patrón de datos

El backend no implementa paginación ni filtros por query params (salvo
fecha en algunos endpoints) — las pantallas traen la lista completa y
filtran/paginan del lado del cliente. Es un patrón deliberado, consistente
en todo el frontend (dashboards de gestor, validador y admin).

## Tests

- Backend: Jest, un archivo `.spec.ts` junto a cada servicio/controlador
  que tiene lógica no trivial. Corre con `npm test` (dentro del contenedor
  o localmente con Node 20+).
- Frontend: Vitest + Testing Library. Corre con `npm test` dentro de
  `frontend/`.

Ambas suites deben estar en verde antes de cualquier cambio — es la
convención de este repo, no solo una recomendación.
