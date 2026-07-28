# Resumen de la sesión nocturna autónoma — 2026-07-28
Rama de trabajo: `test` (gov_ambiental). Nada tocado en `main` de gov-espacio-publico.

## Completado

### A. HITO 0 (cierre)
- **A1**: dominio `ambiental.bogotaneidapp.com` agregado al servicio Railway
  `ambiental-frontend`. Sin acceso a la consola DNS de `bogotaneidapp.com` —
  registros exactos que faltan crear, al final de este documento.
- **A2**: no se pudo verificar el subdominio real end-to-end (bloqueado por
  A1 — DNS no creado). Sí se verificó contra los dominios `*.up.railway.app`
  de ambos servicios (backend/health, frontend, handoff completo).
- **A3**: `VITE_AMBIENTAL_URL` cargado en Railway (`frontend`, servicio del
  hub) apuntando ya al subdominio definitivo `https://ambiental.bogotaneidapp.com`
  — listo para cuando el DNS resuelva y la rama del sidebar se mergee.

### B. HITO 1 — REPLICADO completo
- Tailwind/cva/clsx/tailwind-merge/`cn()`: ya existían de una sesión anterior,
  verificado que siguen idénticos al hub.
- **B6**: `INVENTARIO-COMPONENTES.md` — 44 componentes documentados (nombre,
  ruta, props, cva, imports por `rg`). Hallazgo: `StatusBadge` vs `Badge`
  duplican lógica de color de estado (no se tocó, es refactor no pedido).
- **B7**: primitivas `Button`/`Card`/`Input`/`Select` creadas con `cva` en
  TODAS (el hub solo en 2 de 9). **0 consumidores todavía** — no se hizo el
  reemplazo de HTML crudo por estas primitivas en el resto del código (habría
  sido un refactor de alcance no pedido). `tsc` limpio.
- **B8**: ESLint + `eslint-plugin-tailwindcss` + `eslint-plugin-react-hooks`.
  45 errores reales encontrados y corregidos (3 clases contradictorias
  genuinas — no falsos positivos, código muerto real; 2 catch vacíos;
  `no-undef` desactivado en TS por ser falso-positivo estructural con
  `React.FC`/`React.ChangeEvent`). 1592 warnings sin tocar, según instrucción.
  **Decisión tomada sin preguntar**: usé el set clásico de `react-hooks`
  (`rules-of-hooks`/`exhaustive-deps`) en vez del `recommended` completo de la
  v7 instalada, que trae reglas experimentales de React Compiler
  (`set-state-in-effect`, `immutability`, `static-components`, `purity`) que
  hubiera exigido reescribir lógica de efectos en ~15 archivos sin supervisión
  —riesgo que no tomé en una pasada autónoma nocturna.
- **B9/B10**: `scripts/check-responsive.mjs` con Playwright, corrido contra
  las 7 rutas de `App.tsx` (incluyendo protegidas con tokens JWT reales por
  rol, no solo la pantalla "sin sesión") en 375/768/1440px. **0 desbordamientos
  en ninguna vista.** 20 capturas en `.screenshots/` (gitignored, no
  commiteadas). Nota técnica: `waitUntil:'networkidle'` no sirve en esta app
  (Leaflet no deja de pedir tiles) — usé `'load'` + espera fija.

### C. HITO 2 — avanzado
- **C11**: código muerto de `users.service.ts` eliminado (`createUser`,
  `updateUser`, `deleteUser`, `importUsers`, `getAllUsers` + sus DTOs) —
  verificado con `rg` que 0 archivos los invocaban antes de borrar.
- **C12**: `VALIDADOR_AMBIENTAL`/`ADMIN` ya pueden editar cualquier punto
  (antes solo `GESTOR_AMBIENTAL`, y solo lo suyo). Encontré que el bloqueo
  real no era solo el `@Roles` del controller — el *servicio* tenía un chequeo
  de ownership duro (`createdByUserId !== userId` → 403) que hubiera seguido
  rechazando aunque el rol pasara el guard. Se adaptó para que
  `VALIDADOR_AMBIENTAL`/`ADMIN` lo salten. 2 tests nuevos.
- **C13**: recalculo de estado de `Proceso` al aprobar un punto — **ya estaba
  implementado** (`puntos.service.ts:154`). El `ESTADO-EXTRACCION.md` decía
  "no visto", estaba desactualizado. Le agregué 2 tests que faltaban para
  confirmarlo de verdad (no asumí que "ya está" sin evidencia).
- **C14**: análisis únicamente (no implementado, como se pidió) de
  `files.service.ts` (3 endpoints faltantes, backend R2 propio necesario,
  consumidores exactos) y `survey.service.ts` (confirmado que NO es un gap,
  es contrato cross-repo esperado — 0 acción necesaria). Detalle completo en
  `ESTADO-EXTRACCION.md`.

### D. Cierre
- El `git push` finalmente completó solo (el proceso en background que
  llevaba colgado toda la noche resolvió al final de la sesión). Con eso:
  redeploy de `ambiental-backend` y `ambiental-frontend` en Railway con el
  código de HITO 1 y HITO 2 — ambos `SUCCESS`, healthchecks en 200.
- `PLAN-MAESTRO.md`, `ESTADO-EXTRACCION.md`, `INVENTARIO-COMPONENTES.md`
  actualizados con distinción REPLICADO vs IMPLEMENTADO-SIN-VERIFICAR en cada
  entrada nueva.
- Todo commiteado en `test` y pusheado a `origin/test`, en commits atómicos
  por tarea (ver `git log`).

## Hallazgo importante verificando el redeploy

**La base de datos de producción de `ambiental-backend` (`Postgres-_hTA` en
Railway) nunca tuvo el esquema creado.** `synchronize` está desactivado en
producción (correcto, es la config normal), pero nadie corrió una
sincronización/migración inicial contra esa base — quedó completamente vacía
desde que se creó en HITO 0. Consecuencia: `/api/health` responde 200 (no
toca la base), y `/api/handoff` también funciona (tampoco toca la base) — por
eso el healthcheck del redeploy dio verde y pareció que todo estaba bien —
pero **cualquier endpoint que sí toque datos reales (`GET /puntos`, etc.)
responde 500** con `relation "puntos_residuo" does not exist`.

No lo toqué: crear el esquema en una base de producción es una operación
sobre datos/schema de producción, y aunque técnicamente NO es "la migración
de datos del HITO 3" (eso es traer los datos históricos del hub; esto es solo
crear las tablas vacías), está lo bastante cerca de esa línea prohibida como
para no asumir que puedo decidirlo solo. **Necesitás decidir**: ¿corro un
`synchronize` puntual contra `Postgres-_hTA` para crear el esquema vacío
(sin ningún dato, sin tocar el hub), o preferís hacerlo vos / esperar a que
el HITO 3 completo se planifique?

## Bloqueado / no se pudo hacer

1. ~~`git push origin test` colgado~~ RESUELTO al final de la sesión — el
   Git Credential Manager tardó pero terminó resolviendo solo. Todo está en
   `origin/test`, y ya redesplegué `ambiental-backend`/`ambiental-frontend`
   en Railway con el código de esta noche (`SUCCESS` en ambos). Ver el
   hallazgo de la base de datos vacía arriba — eso sí sigue pendiente.
2. **DNS de `ambiental.bogotaneidapp.com`** — sigue sin crearse (no tengo
   acceso a la consola DNS). Registros exactos que faltan, tal cual los pide
   Railway:

   | Tipo | Nombre | Valor |
   |---|---|---|
   | CNAME | `ambiental` | `21p6rqss.up.railway.app` |
   | TXT | `_railway-verify.ambiental` | `railway-verify=4fa912687f4265426e12bbc037998fa5f3163c3bae2abf665368c94f44a4312b` |

3. **`getUserById` sigue roto** (`GET /users/:id` no existe en el backend,
   usado por `ValidadorActividadPanel.tsx:60`) — no estaba en las tareas
   C11-C14 explícitas, no se tocó. Queda para una decisión tuya: implementar
   el endpoint local, o resolver por proxy contra el hub (ver
   `PLAN-MAESTRO.md`, tabla de decisiones abiertas).
4. **Merge del sidebar a `main` del hub** — explícitamente prohibido esta
   noche, sigue en la rama `feature/ambiental-handoff-sidebar` sin tocar.
5. **Migración de datos HITO 3** — explícitamente prohibida, no se tocó.
6. **Secretos** — no se tocó ni movió ninguno, más allá de lo ya rotado en la
   sesión anterior (JWT_SECRET, R2).

## Decisiones que tomé sin preguntar (usando tu regla de defaults)

- react-hooks: set clásico en vez del `recommended` v7 completo (ver arriba).
- Primitivas `ui/` nuevas (Button/Card/Input/Select): las creé pero NO
  reemplacé el HTML crudo existente por ellas en el resto del código — eso
  hubiera sido un refactor de alcance mucho mayor al pedido ("unificar las
  primitivas"), y con 0 supervisión de por medio preferí no arriesgar romper
  estilos en decenas de archivos.
- No usé `settings.tailwindcss.config` (rompía la resolución del plugin) ni
  `functions` global — configuré `callees` a nivel de regla para excluir
  `cva` de `no-contradicting-classname` específicamente, con comentario
  explicando por qué (son variantes mutuamente excluyentes, no clases que
  convivan).

## Qué necesitás decidir vos

1. ¿Rotamos el secreto compartido `SantaFe2024!Seguro` (users-insert.sql,
   commit `b849a15a` del hub) y confirmamos si sigue vigente? Quedó pendiente
   del incidente de seguridad, no se tocó esta noche (fuera de las 3 tareas
   prohibidas explícitas, pero tampoco estaba en la lista de esta noche).
2. `getUserById` — endpoint propio vs proxy al hub (ver arriba).
3. Módulo `files` (R2 propio para ambiental) — cuándo se implementa, ver
   análisis en `ESTADO-EXTRACCION.md`.
4. Reescribir o no el historial de git de gov-espacio-publico (incidente de
   seguridad) — sigue sin decidir, mencionado en `INCIDENTE-2026-07-28-RESUMEN.md`.

## Por dónde retomar

1. Resolver el push (vos, manualmente) → avisarme para redeploy en Railway.
2. Crear los 2 registros DNS de arriba.
3. Una vez el subdominio resuelva: verificar HITO 0 end-to-end contra
   `ambiental.bogotaneidapp.com` real (login hub → sidebar → handoff).
4. Recién ahí, con tu autorización, mergear el sidebar a `main` del hub.
