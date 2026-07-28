# Plan maestro — Módulo ambiental independiente
Última actualización: 2026-07-28 (sesión nocturna autónoma: HITO 1 replicado, HITO 2 avanzado)

## Objetivo y criterio de terminado
Convertir el módulo ambiental en un servicio independiente, desplegado aparte
(`ambiental.bogotaneidapp.com`), que reemplace al área ambiental hoy embebida
en gov-espacio-publico (`bogotaneidapp.com`).

Criterio final: se puede eliminar
`gov-espacio-publico/packages/frontend/src/pages/gestor-ambiental/` sin romper
el hub, y el ambiental opera de forma autónoma desde su propio subdominio.

## Base de datos de gov-espacio-publico — SOLO LECTURA, SIEMPRE
Regla permanente, sin excepción, no ligada a ningún hito ni sesión. La base
de datos del hub contiene los datos de producción en uso. Este repo NUNCA
escribe en ella: ni INSERT, ni UPDATE, ni DELETE, ni ALTER, ni migraciones.
Solo lectura, y únicamente cuando se necesite consultar o migrar hacia el
ambiental. Esto aplica también durante el HITO 3: la migración LEE del hub y
ESCRIBE en la base de ambiental. En ningún momento modifica el origen.

## Decisiones de arquitectura

- **Identidad centralizada** — gov-espacio-publico es el único proveedor de
  login. Ambiental nunca almacena credenciales, solo referencia usuarios por
  `id`. Evita duplicar auth y mantiene un solo punto de verdad para roles.
- **Base de datos propia, solo negocio** — ambiental tiene su Postgres con
  puntos/rutas/residuos. Nunca tabla `users` con contraseña fuera de la rama
  `version1` (que es la excepción documentada para entrega a terceros).
- **Verificación de JWT, no emisión** — el hub firma con `JWT_SECRET`
  simétrico (HS256); ambiental verifica con el mismo secreto. Ya es el patrón
  de las ramas `test`/`main`/`production` de este repo, no hay que inventarlo.
- **Canario en el sidebar, no reemplazo** — entrada nueva conviviendo con la
  actual hasta verificar en producción. Reduce el riesgo de romper lo que hoy
  funciona; revert de un commit si algo falla.
- **Handoff de sesión sin cookie de dominio compartido** — el hub NO usa
  cookies (confirmado: `sessionStorage` + header `Authorization: Bearer`). No
  se puede introducir una cookie de dominio compartido sin tocar auth del hub,
  y eso requiere autorización explícita que no está dada. Ver HITO 0.
- **Objetivo del handoff: código de un solo uso, canjeado servidor-servidor**
  — un JWT viajando por query param queda en logs de acceso/Referer ANTES de
  que corra JavaScript; `history.replaceState` no lo remedia porque el log ya
  ocurrió. El mecanismo correcto no expone el JWT al navegador en absoluto: el
  hub emite un código opaco de un solo uso (~30s TTL), ambiental lo canjea
  servidor-servidor. Requiere tocar auth del hub (fuera del permiso actual —
  ver HITO 0, tarea de "handoff objetivo").

## HITO 0 — Esqueleto desplegado

**Objetivo:** validar la cadena completa de auth cross-dominio con el módulo
casi vacío, cuando cambiar de rumbo todavía es barato.

**Estado: LOCAL y Railway verificados 2026-07-28. Falta solo el merge del
sidebar del hub y el dominio custom.** Tareas 1-3, 5, 6, 7 hechas. Tarea 8
(subdominio custom `ambiental.bogotaneidapp.com`) pendiente — requiere acceso
a DNS de `bogotaneidapp.com`, no se hizo todavía.

Servicios Railway creados en el proyecto `gov-espacio-publico` (mismo
proyecto que el hub, decisión del usuario — ya aloja también los servicios de
encuestas):
- `ambiental-backend` — https://ambiental-backend-production.up.railway.app
- `ambiental-frontend` — https://ambiental-frontend-production.up.railway.app
- `Postgres-_hTA` — base de datos propia de ambiental (nombre autogenerado,
  sin impacto funcional)

**Incidente de seguridad 2026-07-28**: al conectar ambiental al `JWT_SECRET`
real del hub se encontró que ese valor (y las credenciales de Cloudflare R2
del hub) estaban expuestos en texto plano en el historial de git de
`gov-espacio-publico` (privado) desde enero 2026, en archivos de documentación
ya borrados del árbol pero recuperables del historial. `gov_ambiental`
(público) se auditó completo — sin exposición, limpio. `JWT_SECRET` ya se
rotó y se verificó en ambos servicios (hub y ambiental). R2 en proceso.
Detalle completo fuera de este documento (es un incidente, no un hito del
plan) — ver resumen para la Alcaldía.

Verificado end-to-end contra Railway: `/api/health` del backend responde
200; el frontend sirve 200; `POST /api/handoff` con un JWT firmado con el
`JWT_SECRET` REAL de producción del hub (leído de `backend-api` en Railway,
no inventado) devuelve 302 con el fragmento `#token=...` apuntando al
frontend de ambiental — la cadena de verificación de JWT funciona igual en
la nube que en local. No se probó con login real de un admin de producción
del hub (no hay credenciales de prueba en producción, `bootstrapAdmin` se
desactiva explícitamente si `NODE_ENV=production`) — falta esa prueba final,
que solo puede hacerla un ADMIN real, y solo tiene sentido una vez el sidebar
esté mergeado a `main` del hub.

Bugs reales encontrados y corregidos durante la verificación local (ninguno
es parte del diseño del handoff en sí, pero bloqueaban probarlo):
- `HandoffPage.tsx`: `React.StrictMode` duplica efectos en desarrollo — sin
  guard (`useRef`), la segunda ejecución encontraba el hash ya limpiado por
  la primera y pisaba la sesión exitosa con un error falso.
- `packages/frontend/vite.config.ts` del hub: leía `process.env.BACKEND_URL`
  sin cargar `.env` (Vite no lo hace automático en el config file, solo en
  código de cliente vía `import.meta.env`) — el proxy `/api` apuntaba al
  hostname de Docker (`backend:3000`) y nunca llegaba al backend real en
  desarrollo local sin contenedores.
- `src/config/typeorm.config.ts` en la rama `test` de este repo: `import path
  from 'path'` (default import) rompía en runtime — ya estaba corregido a
  `import * as path` en `version1` pero no se había propagado a `test`.
- CORS del hub (`packages/backend/.env`, local): no incluía
  `bogotaneidapp.local`, solo `localhost` — bloqueaba el login desde el
  hostname que imita el subdominio real.

Bugs reales encontrados y corregidos durante el despliegue a Railway:
- `tsconfig.json` de este repo: `include: ["src", "scripts"]` sin `rootDir`
  explícito hacía que TypeScript infiriera la raíz común del proyecto en vez
  de `src`, y `nest build` emitía a `dist/src/main.js` en vez de
  `dist/main.js`. El Dockerfile busca `dist/main` — el contenedor nunca había
  arrancado en un build de producción real (nunca se había hecho uno hasta
  ahora). Arreglado quitando `scripts` del `include` — ese directorio ya se
  ejecuta vía `ts-node` directo sobre el fuente, no depende del build.
- Railway aplicaba el `railway.toml` de la raíz del repo (config del backend:
  Dockerfile + healthcheck `/api/health`) también al servicio
  `ambiental-frontend`, pese a tener `rootDirectory=/frontend` — rompía su
  build (no hay Dockerfile ahí) y su healthcheck (esa ruta no existe en un
  sitio estático). Arreglado con un `frontend/railway.toml` propio
  (`builder = "RAILPACK"`), que Railway prioriza dentro del `rootDirectory`
  del servicio.

Bugs reales encontrados y corregidos durante la verificación local (ninguno
es parte del diseño del handoff en sí, pero bloqueaban probarlo):
- `HandoffPage.tsx`: `React.StrictMode` duplica efectos en desarrollo — sin
  guard (`useRef`), la segunda ejecución encontraba el hash ya limpiado por
  la primera y pisaba la sesión exitosa con un error falso.
- `packages/frontend/vite.config.ts` del hub: leía `process.env.BACKEND_URL`
  sin cargar `.env` (Vite no lo hace automático en el config file, solo en
  código de cliente vía `import.meta.env`) — el proxy `/api` apuntaba al
  hostname de Docker (`backend:3000`) y nunca llegaba al backend real en
  desarrollo local sin contenedores.
- `src/config/typeorm.config.ts` en la rama `test` de este repo: `import path
  from 'path'` (default import) rompía en runtime — ya estaba corregido a
  `import * as path` en `version1` pero no se había propagado a `test`.
- CORS del hub (`packages/backend/.env`, local): no incluía
  `bogotaneidapp.local`, solo `localhost` — bloqueaba el login desde el
  hostname que imita el subdominio real.

**Tareas:**
1. **[INTERINO — dentro del permiso actual]** En gov-espacio-publico, rama
   nueva (no `main`): añadir env var `VITE_AMBIENTAL_URL` (patrón ya usado por
   `VITE_SURVEYS_API_URL`) y una entrada nueva al array de tabs de
   `AdminDashboard.tsx` (junto a `sector_ambiental`, sin tocarla). En vez del
   `window.location.href` que usa `indicadores_planeacion`, el click arma un
   `<form>` oculto (`method="POST"`, `action="${VITE_AMBIENTAL_URL}/api/handoff"`,
   input oculto `token=<accessToken>`) y lo envía (`form.submit()`). El JWT
   viaja en el cuerpo del POST, no en la URL — no queda en logs de acceso ni en
   `Referer`, que solo registran método+ruta+query, nunca el body.
2. **[INTERINO]** En ambiental (backend): endpoint `POST /api/handoff` que
   recibe `token` del body, valida firma/expiración contra `JWT_SECRET`
   (mismo mecanismo que `JwtStrategy`), y responde con un 302 a
   `/handoff#token=<token>` — el fragmento (`#`) tampoco se transmite nunca al
   servidor ni al `Referer`, es invisible por diseño del navegador.
3. **[INTERINO]** En ambiental (frontend): ruta `/handoff` lee `location.hash`,
   guarda el token en el mismo `sessionStorage`/store que ya usa el login
   propio de este repo (reutiliza el mecanismo existente, no inventa uno
   nuevo), limpia el hash con `history.replaceState`, y redirige según rol
   (`ADMIN` → `/admin`, `GESTOR_AMBIENTAL` → `/gestor-ambiental/dashboard`,
   `VALIDADOR_AMBIENTAL` → `/validador/residuos`).
4. **[OBJETIVO — requiere autorización aparte, fuera de alcance de HITO 0 tal
   como está autorizado hoy]** Reemplazar el mecanismo interino por código de
   un solo uso canjeado servidor-servidor: `POST /auth/handoff/issue` (hub,
   autenticado) genera un código opaco de ~30s TTL asociado al usuario;
   `POST /auth/handoff/exchange` (hub, servidor-servidor, nunca desde el
   navegador) lo canjea y lo invalida atómicamente. Necesita: storage con TTL
   para los códigos (tabla nueva o Redis — el hub no tiene Redis hoy), un
   secreto de servicio-a-servicio nuevo, y `HUB_API_URL` como env var en
   ambiental. Un código filtrado en logs no sirve porque ya fue consumido —
   esto es lo que realmente cierra el riesgo, el interino de la tarea 1-3 solo
   lo reduce. No se implementa sin autorización explícita para tocar auth del
   hub más allá del sidebar.
5. En ambiental (backend): confirmar que `JwtStrategy` valida contra el mismo
   `JWT_SECRET` que usa el hub — mismo mecanismo que `test`/`main`/`production`
   ya usan, no hay que escribirlo de cero, solo confirmarlo apuntando al mismo
   secreto en ambos servicios.
6. Pantalla mínima post-login: nombre y rol del usuario autenticado, nada más.
7. ~~Servicio backend + base de datos de ambiental en Railway. Servicio
   frontend de ambiental en Railway.~~ HECHO 2026-07-28: `ambiental-backend`
   + `Postgres-_hTA` + `ambiental-frontend` creados en el proyecto
   `gov-espacio-publico` (mismo proyecto que el hub), rama `test`, ambos con
   dominio Railway propio y en `SUCCESS`. `JWT_SECRET` de ambiental-backend
   igual al real de producción del hub (leído de `backend-api`, no
   inventado). `CORS_ORIGIN`/`FRONTEND_URL` de ambiental-backend apuntan al
   dominio Railway del frontend.
8. Subdominio `ambiental.bogotaneidapp.com` apuntando al servicio Railway del
   frontend. **PENDIENTE** — requiere acceso a DNS de `bogotaneidapp.com`,
   no se hizo todavía.
9. ~~CORS del backend ambiental~~ HECHO 2026-07-28 con el dominio Railway del
   frontend (`ambiental-frontend-production.up.railway.app`). Falta agregar
   `ambiental.bogotaneidapp.com` cuando se resuelva la tarea 8.
10. ~~Entorno local: hosts con entradas que imiten subdominios~~ HECHO
    2026-07-27: `bogotaneidapp.local` / `ambiental.bogotaneidapp.local`,
    flujo de handoff verificado ahí antes de tocar Railway.

**Criterio de terminado (verificable en pantalla):** un ADMIN entra por
`bogotaneidapp.com`, pulsa la entrada nueva del sidebar, llega a
`ambiental.bogotaneidapp.com` ya autenticado (sin volver a loguearse), y ve una
pantalla que muestra su nombre y su rol.

**Se despliega y se comprueba:** ambos servicios (frontend/backend de
ambiental) visibles y healthy en el dashboard de Railway; healthcheck
`/api/health` en verde; flujo de handoff repetido en producción, no solo
local. HECHO 2026-07-28 salvo la prueba con login real de un ADMIN (bloqueada
hasta que el sidebar del hub esté mergeado — ver arriba).

**Riesgos:**
- El mecanismo interino (POST + fragmento) reduce la exposición del JWT en
  logs pero no la elimina del todo: el token sigue viajando por el navegador y
  vive brevemente en el DOM (input oculto) y en la respuesta 302 — mitigación:
  TTL corto del JWT (ya es 8h por defecto en el hub, evaluar si conviene pedir
  uno más corto solo para este flujo) y priorizar la tarea 4 (código de un
  solo uso) apenas se autorice tocar auth del hub.
- Reloj desincronizado entre servicios podría invalidar `exp` prematuramente
  → mitigación: usar NTP de Railway (por defecto), no es un riesgo real pero
  se verifica en HITO 0 con un login cerca de la expiración.
- Un `JWT_SECRET` compartido entre hub y ambiental significa que ambiental
  puede FABRICAR tokens válidos para toda la plataforma, no solo verificarlos
  — ver "Firma del token" en Decisiones abiertas. Deuda aceptada para HITO 0,
  no bloquea, pero se registra explícitamente.

**Plan de vuelta atrás:** revert del commit del sidebar en el hub (una línea);
apagar el servicio Railway de ambiental no afecta al hub en absoluto (servicio
separado). Cero riesgo para producción del hub porque la entrada original de
Manejo de Residuos no se toca.

**Decisiones abiertas de este hito:** ver tabla general al final — mecanismo
de handoff (interino POST+fragmento vs. código de un solo uso) y firma del
token (HS256 compartido vs. asimétrica) son las dos principales.

## HITO 1 — Cimientos de front

**Objetivo:** fijar el sistema de diseño antes de construir vistas en volumen,
para no retocar 15 pantallas después.

**Estado: REPLICADO 2026-07-28** (sesión nocturna autónoma, rama `test`).
Tareas 1-2 ya estaban hechas de una sesión anterior (`tailwind.config.js`
idéntico byte a byte al hub, `cva`/`clsx`/`tailwind-merge` instalados,
`src/lib/utils.ts` con `cn()`). Se completó esta noche:
- Tarea 3: primitivas `Button`/`Card`/`Input`/`Select` creadas con `cva` en
  TODAS (el hub solo lo usa en 2 de 9) — ver `INVENTARIO-COMPONENTES.md`.
  **IMPLEMENTADO — SIN VERIFICAR EN USO REAL**: 0 consumidores todavía (no se
  hizo el refactor de reemplazar HTML crudo por estas primitivas en el resto
  del código — habría sido un cambio de alcance no pedido).
  `tsc --noEmit` limpio, no rompe el build.
- Tarea 4: ESLint con `eslint-plugin-tailwindcss` (`no-contradicting-classname`
  error, `no-arbitrary-value`/`classnames-order` warning) y
  `eslint-plugin-react-hooks` (set clásico, no el `recommended` v7 completo —
  ver Riesgos). Corridos y REPLICADOS: 45 errores reales encontrados y
  corregidos (3 clases contradictorias genuinas, 2 catch vacíos, `no-undef`
  desactivado en TS por falsos positivos). 1592 warnings quedan sin tocar
  (instrucción explícita: solo errores).
- `scripts/check-responsive.mjs` con Playwright: REPLICADO — corrido contra
  las 7 rutas existentes de `App.tsx` en 375/768/1440px, 0 desbordamientos,
  20 capturas en `.screenshots/` (gitignored). Nota: `waitUntil: 'networkidle'`
  no sirve en esta app (mapas Leaflet no dejan de hacer requests) — se usa
  `'load'` + espera fija de 1.5s.

Verificado con backend+frontend levantados en local (Docker Postgres +
`npm run start:dev` + `npm run dev`), tokens JWT reales por rol para probar
rutas protegidas — no solo la pantalla "sin sesión".

**Tareas:**
1. Copiar la paleta/tokens de `tailwind.config.js` del hub (colores `primary`,
   `success`, `institutional`, `status`, `neutral`, `surface`; tipografía
   Inter con `fontSize` custom; `borderRadius`/`boxShadow`/`spacing` custom) al
   `tailwind.config.js` de ambiental. El hub no tiene breakpoints custom —
   tampoco hace falta aquí.
2. Instalar `class-variance-authority`, `clsx`, `tailwind-merge` en
   `frontend/` de ambiental (mismas versiones que el hub) y crear
   `src/lib/utils.ts` con el mismo helper `cn()`.
3. Inventario de componentes: decidir qué primitivas de `components/ui/` del
   hub se replican aquí (`button`, `badge` con `cva`; `card`, `input`, `label`,
   `select`, `textarea` sin `cva`) vs. cuáles ya existen en ambiental con otro
   nombre/patrón y hay que unificar.
4. El hub NO tiene ESLint de Tailwind ni verificación visual automatizada —
   no hay nada que copiar ahí. Si se quiere ese proceso, se define de cero
   para ambiental: `eslint-plugin-tailwindcss` + capturas en 375/768/1440px
   con detección de overflow horizontal (Playwright o similar), como paso
   nuevo que el hub no tiene.

**Criterio de terminado (verificable en pantalla):** una pantalla de
referencia (ej. login o dashboard vacío) se ve con la misma paleta/tipografía
que el hub, comparando lado a lado a 375/768/1440px, sin overflow horizontal
en ninguno.

**Se despliega y se comprueba:** el frontend de ambiental en Railway sirve la
pantalla de referencia con los estilos aplicados — captura de pantalla en
producción, no solo en local.

**Riesgos:** el hub mismo es inconsistente en su uso de `cva` (solo 2 de 9
componentes) — replicar esa inconsistencia perpetúa deuda. Mitigación: usar
`cva` en TODOS los componentes nuevos de ambiental, aunque el hub no lo haga,
y no tratarlo como divergencia a corregir después.

**Plan de vuelta atrás:** cambios de estilo son solo CSS/config, revert
trivial sin afectar lógica.

**Decisiones abiertas de este hito:** si se replica el inventario completo de
`ui/` del hub o solo lo que ambiental usa hoy — ver tabla general.

## HITO 2 — Paridad funcional

**Objetivo:** cerrar la matriz de paridad de `ESTADO-EXTRACCION.md`.

**Estado: PARCIAL, avanzado 2026-07-28.** De las tareas priorizadas por la
sesión nocturna:
- Edición de punto (VALIDADOR_AMBIENTAL/ADMIN) — **REPLICADO**, con tests
  (`puntos.service.spec.ts`, 2 tests nuevos). `jest`/`tsc`/`build` verdes.
- Recalculo de estado de `Proceso` al aprobar — **REPLICADO**, ya estaba
  implementado, se le agregaron 2 tests que faltaban para confirmarlo.
- Código muerto de `users.service.ts` (5 métodos + 2 DTOs sin consumidores,
  verificado con `rg`) — eliminado. `getUserById`/`getGestores` intactos.
- `files.service.ts`/`survey.service.ts` — solo análisis (no implementado,
  como se pidió). Documentado en `ESTADO-EXTRACCION.md` con endpoints
  exactos, consumidores, y qué haría falta para `files`; `survey` confirmado
  como NO-gap (contrato cross-repo esperado).
- `getUserById` sigue roto (llama `GET /users/:id`, no existe en backend) —
  **NO se tocó esta noche**, fuera del alcance explícito de las tareas C11-C14.
- Esquema de la base de producción de ambiental (`Postgres-_hTA`) — creado con
  migraciones TypeORM versionadas (no `synchronize`). Ver detalle completo y
  el checkbox de salida cumplido en `ESTADO-EXTRACCION.md`, sección "Fase 2 —
  Independencia de código".
- `getUserById` — **REPLICADO 2026-07-28**: módulo `src/users/` propio
  (`users.controller.ts`, `users.service.ts`) que hace de proxy hacia
  `GET /api/users/:id` y `GET /api/users/gestores/list` del hub
  (`HUB_API_URL`, nueva var de entorno, default apunta al servicio
  `backend-api` de Railway). Reenvía el mismo JWT de la sesión (no se acuñó
  secreto nuevo — el hub no tiene mecanismo de service-to-service, solo
  valida cualquier JWT firmado con el `JWT_SECRET` compartido). Cache en
  memoria con TTL de 60s (por `id` para usuario individual, por rol del que
  llama para la lista de gestores, ya que el hub filtra esa lista según el
  rol del caller). Tests en `users.service.spec.ts` (4 nuevos, cache hit/miss
  y propagación de error). `jest`/`tsc` verdes (72 tests, 17 suites).

  **Verificación de degradación y permisos, 2026-07-28:**
  - *Hub caído/colgado:* `crear`/`editar` punto (`PuntosController`) NO
    dependen de `UsersService` — módulos completamente desacoplados, ya
    estaban a salvo estructuralmente. El gap real era que `fetchFromHub` no
    tenía timeout: si el hub aceptaba la conexión y nunca respondía, la
    promesa se colgaba indefinidamente (no un simple error rápido). Corregido:
    `AbortController` con timeout de 4s en el backend (`HUB_TIMEOUT_MS`,
    `users.service.ts`) — ante timeout o error de red lanza
    `ServiceUnavailableException` de inmediato en vez de colgarse. Test nuevo
    que simula un hub que nunca responde y confirma que falla rápido
    (`users.service.spec.ts`, fake timers). Además, timeout de 6s en el
    cliente axios del frontend (`frontend/src/services/users.service.ts`)
    como red de seguridad adicional.
  - Con el timeout corregido, la degradación en pantalla ya funciona como se
    pedía: `ValidadorActividadPanel.tsx` cae a "Información de creador no
    disponible" en vez de spinner infinito; `CreateActivity.tsx`/
    `EditActivity.tsx` ya tenían `.catch(() => setGestores([]))`.
  - **Bug encontrado y corregido en `AsignacionPuntosPanel.tsx`:** el fetch de
    gestores estaba en el mismo `Promise.all` que las asignaciones/sin-asignar
    (datos propios, sin relación con el hub) — si el hub fallaba, el panel
    entero mostraba error y ocultaba datos que sí estaban disponibles.
    Desacoplado: `getGestores()` ahora se resuelve aparte, con su propio
    catch → `[]`, sin bloquear el resto del panel.
  - **Permisos por rol — probado contra el hub real con un token real por
    rol** (`GET /api/users/gestores/list`): el endpoint del hub **no
    restringe por rol** (cualquier JWT válido con
    GESTOR_AMBIENTAL/VALIDADOR_AMBIENTAL/ADMIN devuelve 200). Pero el
    contenido SÍ varía y ahí apareció un problema real: con
    `GESTOR_AMBIENTAL` el hub ya filtra a los 13 gestores ambientales, pero
    con `VALIDADOR_AMBIENTAL` o `ADMIN` devuelve los 90 gestores de TODOS los
    dominios (IVC/ESPACIO_PUBLICO/AMBIENTAL/PYBA), sin acotar. Como
    `PATCH /puntos/:id` ahora permite editar a los 3 roles, un
    VALIDADOR_AMBIENTAL o ADMIN editando un punto veía la lista de "gestores
    involucrados" mezclada con gente de otros dominios.
    **Corregido:** `CreateActivity.tsx` y `EditActivity.tsx` ahora filtran
    `.filter(u => u.role === 'GESTOR_AMBIENTAL')` client-side sobre la
    respuesta del hub, igual que ya hacía `AsignacionPuntosPanel.tsx`.
  - Confirmado: el JWT reenviado al hub no queda en ningún log — no hay
    logging de requests/headers en `main.ts` (sin morgan, sin interceptor),
    `users.service.ts`/`users.controller.ts` no tienen ningún `console.*`.
  - `tsc --noEmit` limpio en backend y frontend; `jest` 73/73; `vitest` sin
    regresiones nuevas (2 fallos preexistentes en `navConfig.test.ts`, no
    relacionados, confirmado corriendo la suite antes de este cambio).

**Tareas, en este orden (ROTO → AUSENTE → PARCIAL):**
1. **ROTO primero:**
   - ~~`getUserById` llama `GET /users/:id`, que no existe en el backend~~ —
     CERRADO 2026-07-28: endpoint propio de proxy/cache implementado en
     `src/users/`, ver detalle en el bloque de estado arriba.
2. **AUSENTE:**
   - Recalculo automático de estado de `Proceso` al aprobar un punto ligado
     (hub: `sorver.controller.ts:486-488`).
   - Módulo `files` (subida de acta/fotos) — bloqueado por decisión abierta ya
     registrada en `ESTADO-EXTRACCION.md`.
3. **PARCIAL:**
   - Permitir edición de punto a `VALIDADOR_AMBIENTAL`/`ADMIN` (hoy solo
     `GESTOR_AMBIENTAL`, `PATCH /puntos/:id`).
4. **Código muerto a eliminar** (no bloquea nada, pero es deuda): `createUser`,
   `updateUser`, `deleteUser`, `importUsers`, `getAllUsers` en
   `users.service.ts` — cero componentes los invocan (confirmado por grep).
   Tabla `users` local y su CRUD de backend se eliminan cuando el proxy al hub
   (tarea 1) esté funcionando, no antes.

**Criterio de terminado (verificable en pantalla):** cada fila de la matriz de
`ESTADO-EXTRACCION.md` pasa a REPLICADA; para cada una, un usuario del rol
correspondiente completa la acción de punta a punta (ej. un VALIDADOR_AMBIENTAL
edita un punto y el cambio se refleja en el mapa del gestor).

**Se despliega y se comprueba:** cada tarea completada se despliega a Railway
antes de pasar a la siguiente — no se acumulan cambios sin desplegar.

**Riesgos:** el proxy de usuarios hacia el hub introduce una dependencia de
red en caliente (si el hub está caído, ambiental no puede resolver nombres de
usuario) — mitigación: cachear localmente por `id` con invalidación simple
(TTL), nunca bloquear la operación principal (crear/editar punto) por un fallo
de esa resolución.

**Plan de vuelta atrás:** cada tarea es un commit/PR independiente, revert
individual sin afectar las demás.

**Decisiones abiertas de este hito:** ninguna — la única (mecanismo de
resolución de usuario por ID) se cerró el 2026-07-28, ver bloque de estado
arriba.

## HITO 3 — Migración de datos (NO trabajar hasta terminar HITO 0-2)

**Objetivo:** mover los datos históricos de la base del hub a la base propia
de ambiental, con transformación de esquema (no copia).

**Alcance exhaustivo — sin recortes.** Debe migrarse TODO lo ambiental: todos
los puntos/actividades en TODOS los estados (no solo activos), rutas
semanales completas incluido histórico, asignaciones de puntos, entradas de
residuos y sus notas, adjuntos (fotos/actas). Auditoría de origen (hub,
SOLO LECTURA, 2026-07-28):

| Entidad hub | Tabla | Rol | ¿Tabla propia o campo embebido? |
|---|---|---|---|
| `ActivityEntity` (`packages/backend/src/sorver/entities/activity.entity.ts`) | `activities` | Entidad central, compartida entre IVC/Espacio Público/Ambiental/PYBA | — |
| `PuntoAsignacion` (`punto-asignacion.entity.ts`) | `punto_asignacion` | Punto → gestor, PK en `activityId` | Tabla propia |
| `RutaSemanal` (`ruta-semanal.entity.ts`) | `ruta_semanal` | Ruta semanal por gestor | Tabla propia |
| `ProcessEntity` (`process.entity.ts`) | `processes` | Agrupa actividades en un proceso | Tabla propia |
| join `activity_gestores` | `activity_gestores` | Gestores involucrados en operativo grupal (M2M) | Tabla propia |
| Residuos + notas | — | Entradas de residuo y su `observaciones` | **Embebido**: `activities.dynamicAnswers.residuos[]` (jsonb) — no hay tabla `notas` separada en el hub |
| Fotos | — | Antes/después | **Embebido**: `activities.photos: text[]`, `activities.photosFase2: text[]` |
| Actas | — | Documento PDF del operativo | **Embebido**: `activities.actaOperativo` (texto legacy), `activities.actaPdfUrl` (URL en R2) |

Filtro para aislar filas ambientales: `activities."operativoCategoria" =
'AMBIENTAL'` (enum `OperativoCategoria`, `enums/operativo.enum.ts`). Hay un
discriminador más estrecho, `operativoSubtipo = 'AMBIENTAL_PUNTOS_ACUMULACION'`
— es el que `residuos.service.ts` exige para permitir seguimiento de residuos.
**Decisión CERRADA 2026-07-28: se migra con el criterio amplio,
`operativoCategoria = 'AMBIENTAL'`.** Motivo: el criterio estrecho excluiría
1 punto `PUBLICADA` que sí es ambiental por categoría (subtipo genérico
`AMBIENTAL`, no `AMBIENTAL_PUNTOS_ACUMULACION`) — perder una fila publicada
por usar el discriminador estrecho no tiene justificación. Decidido por Josh.

`ruta_semanal` y `processes` no tienen columna de categoría propia: son
ambientales por convención de código (ningún otro dominio escribe ahí), no
por constraint de esquema. Vale un chequeo puntual cuando haya datos reales.
`operativo_tipo` (`operativo-tipo.entity.ts`) existe en el schema pero su
join referencia un string (`operativoSubtipo`), no una FK real — parece
vestigial, no se incluye en el alcance de migración salvo que se confirme uso.

**Conteo de filas — línea base de reconciliación, obtenida 2026-07-28.**
Consultas de solo lectura (`SELECT`/`COUNT` únicamente, sin exportar filas)
contra la producción del hub, vía el TCP proxy ya existente del servicio
Postgres del hub (`hopper.proxy.rlwy.net:55251`).

Desglose por estado, `operativoCategoria = 'AMBIENTAL'` (criterio amplio):

| Estado | Filas |
|---|---|
| BORRADOR | 0 |
| ENVIADA | 11 |
| APROBADA | 0 |
| RECHAZADA | 2 |
| PUBLICADA | 333 |
| **Total** | **346** |

Desglose por estado, `operativoSubtipo = 'AMBIENTAL_PUNTOS_ACUMULACION'` (criterio estrecho):

| Estado | Filas |
|---|---|
| ENVIADA | 11 |
| RECHAZADA | 2 |
| PUBLICADA | 332 |
| **Total** | **345** |

**Diferencia entre criterios: 1 fila.** Es una sola actividad en estado
`PUBLICADA` con `operativoCategoria = 'AMBIENTAL'` pero
`operativoSubtipo = 'AMBIENTAL'` (subtipo genérico, no
`AMBIENTAL_PUNTOS_ACUMULACION`). Es decir, el criterio estrecho excluiría
exactamente 1 punto publicado que sí es ambiental por categoría. Confirmado:
se migra con `operativoCategoria = 'AMBIENTAL'` (ver decisión cerrada arriba).

Registros corruptos de import Excel: `results = 'Importado desde Excel'` →
**0 filas** dentro de `operativoCategoria = 'AMBIENTAL'`. **Riesgo eliminado:
no hay nada que descartar por este motivo en el dominio ambiental** — el
import roto del hub, si existe, no toca ninguna de estas 346 filas. No volver
a plantear este chequeo salvo que cambien los datos de origen antes del
corte.

Otras tablas/entidades relacionadas:

| Tabla / dato | Conteo |
|---|---|
| `ruta_semanal` (total) | 12 |
| `processes` (total) | 0 |
| `punto_asignacion` (join contra ambiental) | 345 |
| `activity_gestores` (join contra ambiental, operativos grupales) | 1 |
| Puntos ambientales con al menos 1 entrada de residuo embebida | 346 |
| Total de entradas de residuo embebidas (`dynamicAnswers.residuos[]`) | 1082 |
| Fotos "antes" (`photos[]`) | 12 |
| Fotos "después" (`photosFase2[]`) | 0 |
| Puntos con acta PDF (`actaPdfUrl`) | 1 |
| Puntos con acta de texto legacy (`actaOperativo`) | 106 |

Notas sobre estos números:
- `processes = 0`: ningún punto ambiental está agrupado en un proceso todavía
  en el hub — la tabla `ProcessEntity` existe pero no tiene uso real ahí. No
  bloquea la migración, solo significa que no hay procesos que migrar.
- `punto_asignacion` (345) es casi 1:1 con el total (346) — solo 1 punto
  ambiental no tiene asignación de gestor registrada.
- Fotos "después" en 0 y actas PDF en solo 1 de 346 — la mayoría de la
  evidencia de cierre vive en el campo de texto legacy `actaOperativo` (106),
  no en URL de storage. Relevante para la decisión abierta sobre adjuntos:
  mover a storage propio va a mover principalmente fotos "antes" (12) y 1 PDF,
  no un volumen grande.

**Tareas:**
1. Correr `migrate-from-legacy.ts` (ya existe como embrión) contra un dump de
   staging, nunca contra producción directamente en el primer intento.
2. ~~Contar registros con `results = 'Importado desde Excel'`~~ — CERRADO
   2026-07-28: 0 filas dentro del alcance ambiental, nada que descartar.
3. Aplanar `gestoresInvolucrados` (relación `ManyToMany` en el hub → `uuid[]`
   en ambiental).
4. Decidir manejo de adjuntos (fotos/actas): mover a storage propio o
   mantener referencia al storage del hub — ver Decisiones abiertas.
5. Reconciliación: conteo de filas origen vs. destino, más muestreo manual de
   al menos N registros por estado (`BORRADOR`/`ENVIADA`/`APROBADA`/
   `RECHAZADA`/`PUBLICADA`).
6. El script debe poder correrse múltiples veces sin duplicar (guard de
   idempotencia ya existe: aborta si el destino ya tiene datos — confirmar que
   sigue siendo el comportamiento deseado o si se necesita un modo
   "re-ejecutar sobre destino vacío" explícito).

**Criterio de terminado (verificable):** conteo de puntos en la base de
ambiental == conteo de actividades AMBIENTAL en el hub menos los descartados
por calidad de origen (documentados con motivo), y una muestra de N puntos
migrados se ve idéntica (mismos residuos, mismo estado, mismas fechas) al
verla en ambos sistemas lado a lado.

**Se despliega y se comprueba:** la migración corre contra la base de
producción de ambiental en Railway, no solo en local — con el hub en modo
solo-lectura mientras dura el corte (ver HITO 4 para el momento exacto).

**Riesgos:** correr dos veces sin darse cuenta y duplicar datos → mitigación:
el guard de idempotencia ya existente (aborta si destino no está vacío) se
mantiene como salvaguarda, no se desactiva para "forzar" una re-migración.

**Plan de vuelta atrás:** la base de ambiental se puede vaciar y re-migrar
mientras el hub siga siendo la fuente de verdad (antes del corte de HITO 4) —
no hay pérdida de datos porque el hub no se modifica en este hito.

**Decisiones abiertas de este hito:** ver tabla general — adjuntos y momento
exacto de corte de escritura.

## HITO 4 — Corte

**Objetivo:** la entrada nueva del sidebar reemplaza a la original; se
elimina el legacy del hub.

**Tareas:**
1. Congelar escritura en el gestor-ambiental legacy del hub (solo lectura)
   en el momento acordado con el usuario.
2. Verificar HITO 3 (migración) ya cerrado y reconciliado.
3. Reemplazar la entrada del sidebar: la que apuntaba al tab interno
   `sector_ambiental` ahora apunta a `ambiental.bogotaneidapp.com` (mismo
   patrón ya usado en HITO 0, solo que ahora es la entrada principal, no un
   canario adicional).
4. Eliminar `gestor-ambiental/` de gov-espacio-publico (código legacy) en un
   commit separado, reversible.
5. Eliminar `scripts/migrate-from-legacy.ts` de este repo (ya no aplica, es de
   un solo uso).

**Criterio de terminado (verificable en pantalla):** un GESTOR_AMBIENTAL,
VALIDADOR_AMBIENTAL y ADMIN completan su flujo principal exclusivamente desde
`ambiental.bogotaneidapp.com`; la ruta vieja del hub ya no existe y no hay
ningún enlace roto apuntando a ella en el resto del hub.

**Se despliega y se comprueba:** el hub se redespliega sin la carpeta
`gestor-ambiental/` y sin errores de build; ambiental sigue operando en
Railway sin cambios propios en este hito.

**Riesgos:** algo en el hub referencia código del legacy fuera de la carpeta
`gestor-ambiental/` (ej. un import cruzado no detectado) → mitigación: build
completo del hub en CI/local antes de mergear el borrado, no asumir que un
grep manual bastó.

**Plan de vuelta atrás:** revert del commit de borrado restaura el legacy
íntegro; el sidebar puede revertirse a apuntar de nuevo al tab interno con un
segundo revert independiente.

**Decisiones abiertas de este hito:** ninguna nueva — depende de que las de
los hitos anteriores ya estén cerradas.

## Decisiones abiertas

| Decisión | Default mientras no se resuelva | Quién decide |
|---|---|---|
| Mecanismo de handoff de sesión — interino (dentro del permiso actual) vs. objetivo (código de un solo uso, requiere tocar auth del hub) | Interino para HITO 0: POST con formulario auto-submit (token en el body, no en la URL) + fragmento `#token=` en la redirección de vuelta — no toca auth del hub, solo el sidebar. Migrar a código de un solo uso canjeado servidor-servidor apenas se autorice tocar auth del hub (ver HITO 0 tarea 4 para el detalle de qué hace falta). | Josh |
| Firma del token: HS256 compartido vs. asimétrica (RS256, hub firma con privada, módulos verifican con pública) | HS256 compartido para HITO 0 — ya funciona, no bloquea. Deuda explícita: migrar a firma asimétrica ANTES de sumar un segundo módulo al esquema de identidad centralizada, porque con secreto compartido cualquier módulo puede fabricar tokens válidos para toda la plataforma, no solo verificarlos. | Josh |
| Inventario de `ui/` a replicar en HITO 1 (completo vs. solo lo usado hoy) | Solo lo que ambiental usa hoy (Button, Badge, Card, Input, Select) — no construir primitivas sin consumidor. | Josh |
| Adjuntos (fotos/actas) en la migración: mover a storage propio o referenciar el del hub | Referenciar el storage del hub (no mover archivos) hasta que el módulo `files` propio (ver `ESTADO-EXTRACCION.md`) esté resuelto. | Josh |
| Momento exacto de corte de escritura (HITO 4) | Ventana de mantenimiento anunciada, mínimo 24h antes, con el hub en solo-lectura durante la migración final de HITO 3. | Josh |
| Módulo `files` / almacenamiento R2 (heredado de `ESTADO-EXTRACCION.md`) | No implementar nada nuevo hasta HITO 2. | Josh |
| `bulk-delete` de puntos (heredado de `ESTADO-EXTRACCION.md`) | No replicar hasta confirmar uso real en el hub. | Josh |

## Fuera de alcance

- Los 11 roles no ambientales del hub (`IVC`, `ESPACIO_PUBLICO`, `PYBA`,
  `DEPORTES`, `TUTOR`, `ESTUDIANTE` y sus variantes de gestor/validador).
- Endpoints ya rotos en el hub: `editar-residuo`, `import-ambiental-excel` —
  no se replican, son deuda del origen, no de la extracción.
- Cualquier feature nueva no presente hoy en el hub — este plan es paridad +
  independencia, no expansión de alcance funcional.
- Migración de HS256 (secreto compartido) a firma asimétrica (RS256) para la
  emisión de tokens del hub — es trabajo de plataforma (afecta a todos los
  módulos presentes y futuros, no solo a ambiental), no de esta extracción.
  Queda registrado como deuda en Decisiones abiertas, se resuelve aparte.
