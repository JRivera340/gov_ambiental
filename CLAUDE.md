# Gov Ambiental — Contexto para Claude Code

Repo git INDEPENDIENTE. Módulo ambiental extraído de `gov-espacio-publico`.
**CANÓNICO** para el dominio ambiental — todo desarrollo nuevo va aquí.

## PLAN-MAESTRO.md y ESTADO-EXTRACCION.md
Dos documentos, dos preguntas distintas:
- **PLAN-MAESTRO.md** — hacia dónde vamos. Hitos (0 a 4) para llegar a módulo
  independiente en `ambiental.bogotaneidapp.com`, con decisiones de
  arquitectura, criterios de terminado verificables y decisiones abiertas.
  Léelo antes de planificar trabajo nuevo o proponer arquitectura.
- **ESTADO-EXTRACCION.md** — dónde estamos hoy. Matriz de paridad vista por
  vista contra el hub, pendientes concretos, divergencias deliberadas.
  Léelo antes de tocar código de una vista/endpoint existente.

Este repo es la extracción del módulo ambiental de gov-espacio-publico
("bogotaneidapp"), en fase de PARIDAD FUNCIONAL (HITO 2 de PLAN-MAESTRO.md).
La referencia de comportamiento es SIEMPRE la implementación del hub. Ante una
duda sobre cómo debe funcionar algo, consulta el original en
gov-espacio-publico antes de improvisar.

**gov-espacio-publico ya NO es solo-lectura sin excepción a nivel de CÓDIGO**
— desde PLAN-MAESTRO.md HITO 0 se permite tocar, en rama aparte (nunca
`main`): el sidebar de admin (entrada nueva), la ruta/enlace que esa entrada
necesita, y variables de entorno con la URL del módulo ambiental. Todo lo
demás del código del hub (auth, roles, entidades, el gestor-ambiental legacy)
sigue prohibido sin autorización explícita del usuario.

## Base de datos de gov-espacio-publico — SOLO LECTURA, SIEMPRE
Regla permanente, sin excepción, no ligada a ningún hito. La base de datos
del hub contiene los datos de producción en uso. Este repo NUNCA escribe en
ella: ni INSERT, ni UPDATE, ni DELETE, ni ALTER, ni migraciones. Solo lectura,
y únicamente cuando se necesite consultar o migrar hacia el ambiental.

Esto aplica también durante el HITO 3: la migración LEE del hub y ESCRIBE en
la base de ambiental. En ningún momento modifica el origen.

El permiso de tocar código del hub (párrafo anterior) es exclusivamente eso
— código del hub, en rama aparte. No se extiende ni remotamente a su base de
datos.

Actualiza ESTADO-EXTRACCION.md cuando una tarea:
- cambie el estado de una fila de la matriz de paridad
- replique una vista o endpoint que faltaba
- introduzca una divergencia deliberada respecto al original
- cierre una decisión que estaba abierta

Actualiza PLAN-MAESTRO.md cuando una tarea cierre un hito, cambie una decisión
de arquitectura, o resuelva una decisión abierta de la tabla.

Cambia solo las líneas afectadas y la fecha en cada documento. No los
reescribas enteros ni les añadas historial.

---

## 0. Ramas — ⚠️ leer antes de asumir nada de auth

Se trabaja sobre 4 ramas con roles distintos:

| Rama | Rol | Auth |
|---|---|---|
| `version1` | Entrega puntual de proyecto a terceros | **Login propio** (tabla `users` con contraseña) |
| `test` | Desarrollo activo | JWT emitido por gov-espacio-publico |
| `main` | Código ya revisado por QA | JWT emitido por gov-espacio-publico |
| `production` | Código en producción | JWT emitido por gov-espacio-publico |

**El resto de este documento (secciones de auth/JWT) aplica a `test`/`main`/`production`. NO aplica a `version1`** — esa rama tiene su propio sistema de login y no confía en un JWT externo. Antes de tocar auth, confirmar en qué rama se está parado (`git branch --show-current`).

---

## 1. Stack

| Layer | Tecnología |
|---|---|
| Backend | NestJS 11 + TypeORM, npm |
| Frontend | React 18 + Vite 7 + TailwindCSS |
| Mapas | leaflet, @mapbox/togeojson (parseo KMZ) |
| Estado | Zustand |
| Formularios | react-hook-form |
| HTTP client | axios |
| Seguridad | helmet |

Prefijo global API: `/api`. CORS: origen validado por whitelist + `*.railway.app` (ver `src/main.ts`).

---

## 2. Estructura de carpetas

```
src/
  auth/               # JWT + guards + decorators — NO en version1, ver sección 0
  users/
  puntos/             # Puntos de acumulación de residuos — entidad central
    entities/         # EstadoPunto, ResiduoEntry, ResiduoNota
    dto/
  procesos/           # Agrupa puntos/actividades en un proceso
  asignaciones/       # PuntoAsignacion — gestor asignado a cada punto
  rutas-semanales/    # Rutas de recolección por semana
  sectores/           # Parseo KMZ + panel de sectores de recolección
  catalogos/
  common/enums/        # Role
  config/               # env.ts
scripts/
  seed.ts
  mint-test-token.ts
  migrate-from-legacy.ts   # Migración de datos desde gov-espacio-publico
frontend/src/
  pages/
    gestor-ambiental/
    validador/
    admin/
    public/
  services/lib/
  store/
```

---

## 3. Roles del dominio

Solo 3 (subset de los 5 de gov-espacio-publico):
```typescript
enum Role { GESTOR_AMBIENTAL, VALIDADOR_AMBIENTAL, ADMIN }
```

---

## 4. Invariantes del dominio ambiental

- **`PuntoResiduo`** (`src/puntos/`) es la entidad central — equivalente a `ActivityEntity` en gov-espacio-publico pero solo para el dominio ambiental. Estados: `BORRADOR → ENVIADA → APROBADA/RECHAZADA → PUBLICADA` (mismo ciclo que el legacy).
- **`PuntoAsignacion`** (`src/asignaciones/`) vincula `puntoResiduoId` → `gestorId`. Es tabla propia con PK en `puntoResiduoId`, no una FK embebida en el punto. **Es una tabla separada por diseño. No consolidarla como campo embebido en Punto ni proponer esa simplificación.**
- **Rutas semanales** (`src/rutas-semanales/`) tienen lógica propia en `lib/` (separada de la entidad) — seguir el mismo patrón de extraer lógica pura para tests.
- **Sectores** se derivan de parseo KMZ (`kmz-parser.service.ts`), igual que en el legacy (`RecoleccionUrbana.kmz`).
- **`ResiduoEntry`/`ResiduoNota`** son tipos embebidos dentro del punto (JSON), no entidades TypeORM separadas — mismo patrón que `dynamicAnswers.residuos[]` del legacy.
- **Usuarios** no tienen tabla propia aquí (excepto en `version1`, ver sección 0) — se resuelven vía proxy contra el hub (`src/users/`). El endpoint del hub `GET /users/gestores/list` filtra por el ROL DE QUIEN LLAMA, no por dominio: un `GESTOR_AMBIENTAL` recibe solo gestores ambientales, pero `VALIDADOR_AMBIENTAL`/`ADMIN` reciben los gestores de TODOS los dominios (IVC, espacio público, PYBA, deportes). **El filtrado por dominio se hace SIEMPRE en el proxy del backend (`UsersService.findGestores`), nunca en componentes de frontend.** El módulo ambiental no debe recibir usuarios de otros dominios ni por un instante, así el consumidor los descarte después.

---

## 5. Relación con el legacy (gov-espacio-publico)

- El dominio ambiental sigue viviendo TAMBIÉN en `gov-espacio-publico/packages/frontend/src/pages/gestor-ambiental/` — **congelado**, no recibe features nuevas.
- `scripts/migrate-from-legacy.ts` es una migración de **una sola vez** (batch), no sincronización activa: lee de la BD vieja en modo solo lectura, escribe en la BD nueva, y aborta si la tabla destino ya tiene datos (guard de idempotencia). No corre en ningún pipeline automático (no está en Dockerfile, CI ni cron) — se ejecuta a mano vía `npm run migrate:legacy` cuando corresponda hacer el corte. **Eliminar el script tras el corte del legacy ambiental** — no confundirlo con sincronización activa entre repos.
- Los enums de estado (`EstadoPunto`) y el flujo de aprobación replican el legacy a propósito — no diverger sin razón de negocio explícita.
- Si una tarea requiere saber cuál copia (legacy o este repo) es la fuente de verdad para un caso concreto, preguntar antes de asumir.

---

## 6. Qué NO tocar sin consultar

- Los 3 roles del enum — no agregar roles genéricos de gov-espacio-publico (GESTOR, VALIDADOR) que no aplican a este dominio.
- Estructura de `PuntoAsignacion` (PK en `puntoResiduoId`) — cambiarla rompe el mapeo con datos migrados del legacy.
- `scripts/migrate-from-legacy.ts` — script de migración de datos, no ejecutar contra producción sin confirmar.
- Patrón TypeORM para updates (heredado del legacy): castear fechas explícitamente antes de `Object.assign` + `save()`, nunca `repo.update()` directo — mismo bug documentado en `gov-espacio-publico/.claude/CLAUDE.md` sección 11 (bug `toISOString`).
- **Cambio de entidad sin su migración en el mismo commit.** Con `synchronize: false` en producción, TypeORM arma sus `SELECT` con TODAS las columnas mapeadas en la entidad — si el código nuevo llega antes que la columna exista, rompe TODOS los endpoints que tocan esa tabla, no solo la feature nueva. Regla fija: entidad + migración van juntas, un solo commit. Las migraciones corren automáticamente al desplegar (`startCommand` en `railway.toml`, `npm run migration:run:dist` antes de `node dist/main` — si la migración falla, el contenedor no arranca, mejor caído que sirviendo con esquema viejo). Incidente real: commit `2dcd106` (2026-07-30) agregó `tipoOperativo` a `PuntoResiduo` y se pusheó antes de que existiera este mecanismo — corregido el mismo día.

---

## 7. Política de tests

Heredada de gov-espacio-publico: **todo cambio/fix/feature debe incluir tests, suite verde antes de commit.** 18 archivos `.spec.ts` existentes como referencia de patrón (`sectores`, `asignaciones`, etc. usan specs junto al service).

---

## 8. Comandos

```bash
npm run start:dev      # Backend dev (watch)
npm run build           # Backend build
npm run test             # Backend tests (Jest)
npm run seed              # Poblar datos de prueba
npm run migrate:legacy    # Migrar datos desde gov-espacio-publico
npm run migration:run     # Migraciones locales (ts-node contra src/)
npm run migration:run:dist # Migraciones contra dist/ compilado (lo que corre Railway antes de arrancar)

# Frontend (dentro de frontend/)
npm run dev
npm run build
```

### Variables de entorno (backend, `src/config/env.schema.ts`)

| Variable | Default | Requerida |
|---|---|---|
| `NODE_ENV` | — | No |
| `PORT` | `3001` | No |
| `CORS_ORIGIN` | `http://localhost:5173` | No |
| `FRONTEND_URL` | `http://localhost:5173` | No (fallback para link público del reporte XLSX) |
| `JWT_SECRET` | — | **Sí** |
| `DB_HOST` | — | **Sí** |
| `DB_PORT` | `5432` | No |
| `DB_USERNAME` | — | **Sí** |
| `DB_PASSWORD` | — | **Sí** |
| `DB_DATABASE` | — | **Sí** |
