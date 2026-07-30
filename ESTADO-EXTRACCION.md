# Extracción del módulo ambiental — estado
Última actualización: 2026-07-29 (auditoría de matriz REPLICADA contra código real en `test`, integridad de datos migrados, comparación de las 38 preguntas del formulario contra la encuesta viva, causa raíz del patrón "resuelto en docs / roto en código", fix real de rutas /sorver/*, cierre de 2 anomalías de migración)

## Contexto
Este repo es la extracción del módulo ambiental de gov-espacio-publico
(en producción: "bogotaneidapp"). El módulo original sigue vivo y en uso allá.
Objetivo final: que este módulo, ya independiente, reemplace al actual dentro
de bogotaneidapp.

## Fase actual: PARIDAD FUNCIONAL
Traer el módulo completo tal como está implementado en el hub, con las vistas
de los tres roles: admin, gestor, validador. Las fases 2, 3 y 4 no se trabajan
todavía.

## Rama principal
`version1` es la rama activa de esta sesión, pero es la EXCEPCIÓN: tiene login
propio (tabla `users` con contraseña, JWT autoemitido). Las ramas `test`,
`main` y `production` comparten JWT emitido por gov-espacio-publico y no tienen
tabla `users` propia. `version1` existe para que un tercero use este repo de
forma standalone sin depender del hub para auth. La paridad funcional (vistas,
roles del dominio, endpoints de negocio) aplica igual en las 4 ramas; solo el
mecanismo de autenticación difiere.

## Roles del módulo

| Rol | Nombre exacto en role.enum.ts | Qué puede hacer | Estado aquí |
|---|---|---|---|
| Gestor ambiental | `GESTOR_AMBIENTAL` | crea/edita puntos, gestiona ruta semanal, ve asignación propia | Completo |
| Validador ambiental | `VALIDADOR_AMBIENTAL` | aprueba/rechaza puntos, marca sectores recogidos, ve mapa de residuos | Completo |
| Admin | `ADMIN` | asigna puntos a gestores, ve indicadores agregados, ve mapa/mapa de residuos | Completo (ruta `/admin`, ver matriz) |

En el hub existen 11 roles adicionales (otros dominios: IVC, ESPACIO_PUBLICO,
PYBA, DEPORTES, TUTOR, ESTUDIANTE) — fuera de alcance, no replicar.

## Matriz de paridad

**Definición de REPLICADA, corregida 2026-07-29 tras el recorrido visual de
Josh como ADMIN:** paridad visual Y funcional contra el hub, no solo que el
componente exista y compile. La fila ADMIN estaba marcada REPLICADA por esa
definición vieja — el componente existía, montaba, tenía tests, pero la
pantalla real es otra (shell minimalista vs. el panel rico del hub). Bajada a
PARCIAL. **Ninguna otra fila de esta tabla fue comparada visualmente pantalla
contra pantalla hasta hoy** — se marcaron REPLICADA por existencia de código +
tests, exactamente el mismo criterio insuficiente. Bajadas todas a PENDIENTE
DE VERIFICACIÓN VISUAL hasta que alguien las recorra una por una, igual que
se hizo con ADMIN.

| Vista | Rol(es) | Ruta hub | Ruta aquí | Estado | Qué falta |
|---|---|---|---|---|---|
| Mapa general gestor | GESTOR_AMBIENTAL | `/gestor-ambiental/dashboard` | igual | PENDIENTE DE VERIFICACIÓN VISUAL | Nunca comparada pantalla contra pantalla |
| Planificador ruta / ruta activa / segmento / historial | GESTOR_AMBIENTAL | viewModes del dashboard | igual (viewMode extra `historial`) | PENDIENTE DE VERIFICACIÓN VISUAL | Nunca comparada pantalla contra pantalla |
| Crear punto | GESTOR_AMBIENTAL | `CreateActivity` genérico multi-categoría | `CreateActivity` dedicado solo AMBIENTAL, formulario fijo (26 columnas propias, ver detalle abajo) | PENDIENTE DE VERIFICACIÓN VISUAL | Nunca comparada pantalla contra pantalla; el mapeo de datos ya se verificó (ver "Formulario" abajo), falta el diseño de la pantalla |
| Editar punto | GESTOR_AMBIENTAL, VALIDADOR_AMBIENTAL, ADMIN | permite editar a validador/admin | `PATCH /puntos/:id` permite los 3 roles; GESTOR_AMBIENTAL sigue restringido a lo suyo, VALIDADOR_AMBIENTAL/ADMIN pueden editar cualquier punto | PENDIENTE DE VERIFICACIÓN VISUAL | El permiso backend está probado con tests; la pantalla no se comparó |
| Dashboard validador / Mapa de residuos validador | VALIDADOR_AMBIENTAL | `/validador/dashboard` (compartido con PYBA) + `/validador/residuos` | una sola vista (`ValidadorMapaDashboard.tsx`, tabs/filtros/paginación); `/validador/dashboard` es un `Navigate` a `/validador/residuos` en `App.tsx` — dos rutas, mismo componente, no dos vistas distintas | PENDIENTE DE VERIFICACIÓN VISUAL | Nunca comparada pantalla contra pantalla |
| Vista pública de punto | público | `GET /sorver/public/actividad/:id` | `GET /puntos/public/:id` | PENDIENTE DE VERIFICACIÓN VISUAL | Nunca comparada pantalla contra pantalla |
| Admin — asignación de puntos + indicadores | ADMIN | montado en `/admin/dashboard` (tab `EnvironmentalTab`, uno de varios tabs multi-dominio) | `AdminDashboard.tsx` propio (un solo tab, mono-dominio) + ruta `/admin` | **PARCIAL — recorrido visual 2026-07-29, ver "Auditoría visual de ADMIN" abajo** | Encabezado, panel de filtros globales, sidebar de lista de residuos, filtro de mapa completo, "Ver detalle" roto, 2 bugs de cálculo — detalle completo abajo |

## Auditoría visual de ADMIN 2026-07-29: componente existe, pantalla no coincide

Josh recorrió `/admin` como ADMIN real. El componente existe y funciona (ver
sección anterior), pero la pantalla no tiene paridad visual con el hub —
había sido marcada REPLICADA usando "el componente existe y compila" como
criterio, no "se ve y se comporta igual". Comparación elemento por elemento,
SOLO LECTURA contra el hub:

| Elemento | Hub | Aquí | Estado |
|---|---|---|---|
| Encabezado | Barra roja institucional, logos, "Sistema de Seguimiento Territorial / Alcaldía Local de Santa Fe · Panel de Administración" | Barra blanca, "Admin — Sector Ambiental" | FALTA |
| Iconos de marcador del mapa | `createMarkerIcon`: círculo de color + PNG enmascarado + badge de número | Idéntico byte a byte (`adminHelpers.ts`/`adminConstants.ts`), mismo `#7c2d12`, mismo `/icons/Residuos.png` | YA COINCIDE — no es gap |
| Panel de Filtros Globales | Sidebar derecho: Estado, Categoría/Tipo, Barrio, Turno, mes, Desde/Hasta, Limpiar/Aplicar | No existe | FALTA COMPLETO |
| Filtros del mapa (separados de los globales) | Botón "Filtros" propio del tab mapa | 2 `<select>` inline (Estado, Tipo de Residuo), sin Barrio/Turno/fecha, no separados | PARCIAL |
| Sidebar "Lista de Residuos" | Panel flotante: contador real, buscador #, filtro Barrio, tabs Recogidos/Pendientes, lista con #/barrio/fecha/"Ver detalle" | Botón existe (`setPointsSidebarOpen`), pero ningún componente escucha ese estado — no se renderiza nada | FALTA COMPLETO, botón fantasma |
| "Ver detalle" | `/admin/actividad/${id}` — ruta real en el router del hub | Mismo literal copiado, pero esa ruta no existe en `App.tsx` de este repo | ROTO — pestaña en blanco |
| Panel de Control (Ident/Recog/Tasa/Val) | 4 métricas | Existen visualmente, 2 con cálculo equivocado (ver abajo) | PARCIAL |
| Estado del Sistema / Tiempo de Recolección / gráficas de torta / leyenda | Existen | Existen, mismo componente reusado | COINCIDE |
| Sidebar izquierdo multi-tab (IVC/Espacio Público/PYBA/Deportes/etc.) | Existe | No existe | NO ES GAP — divergencia correcta, este repo es mono-dominio por diseño |

**Cifras — 2 bugs de cálculo confirmados en código, no de datos:**
- `useAdminDashboard.ts:29` — "Ident." cuenta **entradas de residuo**
  (`for (const r of getResiduos(a)) totalIdentified++`, de ahí 1087), el hub
  cuenta **puntos**. Corregir la definición al implementar, verificando
  primero qué cuenta exactamente el hub.
- `useAdminDashboard.ts:59` — `totalVal` filtra `status === 'APROBADA'`, un
  estado transitorio que casi nunca tiene filas en reposo (se convierte en
  `PUBLICADA` casi de inmediato). Debe ser `status === 'ENVIADA'` (11 puntos
  reales en ese estado, ver conteo del HITO 3).
- La diferencia 346→342 en Actividades y en metros lineales es deriva normal
  — el hub sigue en producción y sigue sumando datos, mismo fenómeno que los
  5 residuos de más ya explicado arriba.

**Filtro Categoría/Tipo, ajuste para cuando se implemente el panel de
filtros:** en el hub ese selector lista IVC/Espacio Público/Ambiental/PYBA/
Deportes. Acá debe listar solo lo ambiental — no replicar los otros 4
dominios.

**Pendiente de implementar (aprobado por Josh, no implementado todavía —
requiere el panel de filtros + sidebar + fix de rutas + fix de 2 métricas):**
encabezado institucional, panel de filtros globales completo, sidebar de
lista de residuos completo, separar filtros de mapa, arreglar "Ver detalle",
arreglar "Ident."/"Val".

## Corrección de integridad 2026-07-29: la fila de ADMIN estaba marcada REPLICADA sin código en esta rama

Al implementar la redirección por rol tras el handoff (PLAN-MAESTRO.md HITO 2)
se encontró que `/admin` no existía en `App.tsx` y que `EnvironmentalTab.tsx`
no tenía **ningún consumidor** en todo el repo — contradice la fila de arriba,
que decía REPLICADA con fecha 2026-07-27.

**Causa raíz, confirmada con `git log --all`:** el commit que construyó
`AdminDashboard.tsx`/`useAdminDashboard.ts`/la ruta `/admin` (`c30db0c`,
2026-07-27 18:14) se hizo en la rama `version1` — nunca en `test`, y ni
siquiera se empujó a `origin/version1` (quedó solo local). Cuatro horas
después, el commit `9f2cb7c` en `test` copió `PLAN-MAESTRO.md`,
`ESTADO-EXTRACCION.md` y `CLAUDE.md` completos desde `version1` ("viven donde
ocurre el desarrollo real de cada hito", dice el mensaje del commit) — pero
copió el TEXTO sin portar el CÓDIGO correspondiente. La matriz importada
describía el estado real de `version1`, no el de `test`, y nadie lo notó
porque los documentos de estado no se verifican contra el código al copiarlos
entre ramas.

**Auditoría de las demás filas introducidas por ese mismo commit** (para no
repetir el problema de creer sin verificar):
- **Falso, igual que ADMIN:** "interfaz de `EnvironmentalTab` simplificada de
  17 a 12 props" — nunca se aplicó en `test`; el archivo seguía con sus 14
  props originales (incluyendo 4 verificadas como código muerto: ninguna se
  llama dentro del componente).
- **Falso, y en producción ahora mismo:** los 12 archivos KMZ/KML de
  `frontend/public/boundaries/` y el ícono `Residuos.png` de
  `frontend/public/icons/` que el punto 8 de "Pendiente de replicar" daba por
  `RESUELTO 2026-07-27` — las carpetas no existían en absoluto en `test`. Esto
  significa que los polígonos de referencia (Santa Fe, UPZ, colegios, etc.) no
  se dibujaban en NINGÚN mapa (gestor, validador, admin) y la validación
  "¿el punto cae dentro de Santa Fe?" en `CreateActivity`/`EditActivity`
  fallaba en silencio (atrapada por un `catch`) — un bug real, no cosmético,
  que estuvo activo en producción sin que nadie lo notara.
- **Cierto, verificado con contenido real:** "Dashboard validador ... ya
  portado (commit 83f72bb)" — el hash citado (`83f72bb`) no es antecesor de
  `test` (es cita cruzada de otra rama), pero el archivo real en `test`
  (`ValidadorMapaDashboard.tsx`, 503 líneas) tiene el contenido completo de
  tabs/filtros/paginación, casi idéntico a la versión de `version1` (509
  líneas) — la funcionalidad SÍ existe, solo la referencia al commit es
  incorrecta. No se trata como falla.

**Corregido 2026-07-29:** `AdminDashboard.tsx` + `useAdminDashboard.ts`
portados a `test` (adaptados: `EnvironmentalTabProps` de este repo sigue en
14 props, no 12 — se le pasan valores reales a las 4 "muertas" en vez de
recortar la interfaz, para no arriesgar una refactorización más amplia sin
necesidad), ruta `/admin` guardada a rol ADMIN en `App.tsx`, y los 12
archivos KMZ/KML + el ícono copiados desde `version1` a `frontend/public/`.
`tsc`/`vitest` limpios (128/128).

**Lección para el proceso:** copiar documentos de estado entre ramas sin
portar el código que describen rompe la confiabilidad de la matriz. De ahora
en adelante, cualquier fila marcada REPLICADA/RESUELTO debe poder verificarse
con el código presente en la rama actual, no en otra.

## Causa raíz confirmada 2026-07-29: por qué "resuelto en docs" y "código real" divergieron dos veces

La fila ADMIN (arriba) y el hallazgo de `process.service.ts`/
`SectorRecoleccionPanel.tsx` (ver "Pendiente de replicar" ítem 5) son el
mismo problema, no dos. Investigado con `git reflog`, `git log --all` y
comparación local vs `origin` (sin destruir nada, solo lectura de historial):

- La rama local `test` se creó desde `origin/test` recién el **2026-07-27
  21:10:43**. Desde el **2026-07-24 16:52** hasta ese momento — casi 3 días
  — el checkout estuvo parado en `version1`, incluidas las sesiones que
  creían estar avanzando el HITO 2 de `test`.
- En esos 3 días se hicieron 9 commits en `version1` que en realidad eran
  trabajo de `test`: creación de `ESTADO-EXTRACCION.md` (`76b0826`), creación
  de `PLAN-MAESTRO.md` (`ab7ccb2`), el fix de rutas `/sorver/*` → `/procesos`
  y `/sectores` (`f6b6dcf`), el montaje de `AdminDashboard` (`c30db0c`), los
  assets KMZ (`acf1feb`), entre otros. **Ninguno de los 9 llegó nunca a
  `origin`** — ni a `origin/test` (obvio, no estaban en esa rama) ni siquiera
  a `origin/version1` (confirmado: `origin/version1` seguía en `83f72bb`, sin
  moverse). No es un problema de push que se cuelga y se pierde — nunca se
  intentó pushear, se quedaron 100% locales.
- Cuando por fin se hizo checkout a `test` (`32894c7`, historia idéntica a
  `origin/main` de 3 días atrás), el primer commit ahí (`9f2cb7c`) mezcló una
  feature real (handoff) con una copia de archivo completo de los 3 `.md` de
  estado desde `version1` — el texto que describía los 9 commits como hechos
  viajó, el código no.
- Confirmado que NO hay pérdida de trabajo por Git Credential Manager
  colgándose en push: `test` local y `origin/test` están (y estuvieron
  siempre) sincronizados sin divergencia — cero commits de diferencia en
  ambas direcciones en todo momento verificable por `reflog`. Tampoco hay
  worktrees involucrados (`git worktree list` solo muestra el único checkout
  activo).

**Causa raíz real: no fue una falla de Git, fue no verificar en qué rama se
estaba parado durante 3 días, combinada con copiar documentos de estado como
archivo completo en vez de portar los commits que describen.**

**Cambio de proceso para que no se repita:**
1. Verificar `git branch --show-current` al empezar cualquier sesión de
   trabajo, no solo antes de tocar auth (la única excepción que ya
   mencionaba `CLAUDE.md`).
2. Nunca copiar `PLAN-MAESTRO.md`/`ESTADO-EXTRACCION.md`/`CLAUDE.md` completos
   entre ramas. Si hace falta traer el ESTADO de una rama a otra, se
   cherry-pickean o rehacen los COMMITS de código primero, se verifican en la
   rama destino (tests, `tsc`, prueba en caliente), y solo entonces se
   actualizan los documentos para describir lo que YA está confirmado en esa
   rama.
3. Ninguna fila de la matriz pasa a REPLICADA/RESUELTO sin una cita
   verificable (archivo:línea o comando ejecutado) al momento de escribirla
   — no basta con que "ya se hizo en algún lado".

## REGRESIÓN detectada 2026-07-29: 26 de 38 respuestas del formulario de creación se descartan silenciosamente

Al convertir el formulario dinámico de "Crear punto" a formulario fijo (ver
PLAN-MAESTRO.md, tarea de eliminación de `gov_encuestas_publico`) se encontró
que el `onSubmit` de `CreateActivity.tsx` solo envía al backend `dateTime`,
`lat/lng/barrio`, `entidadResponsable`, `residuos[]` y `gestoresInvolucradosIds`
(casi siempre vacío). Las otras 26 respuestas de las 38 preguntas del
formulario general (frecuencia de acumulación, tipo de zona, tipo de suelo,
condiciones de la zona, identificación del generador, actores estratégicos,
intervenciones recomendadas, etc. — ver lista completa más abajo) se capturan
en pantalla y se pierden al guardar. `PuntoResiduo` (la entidad de este repo)
no tiene columnas para ninguna de ellas.

**Confirmado que es regresión, no deuda de origen**: en `gov-espacio-publico`
(hub, verificado SOLO LECTURA) `ActivityEntity` sí tiene una columna
`dynamicAnswers` (jsonb, `activity.entity.ts:179`), y
`sorver.repository.typeorm.ts` mapea `dto.operativoData` → `entity.dynamicAnswers`
al crear/editar (líneas 591-609 y 300-309) y de vuelta a `operativoData` al
leer (líneas 349, 402) — el hub sí persiste y devuelve las 38 respuestas
completas. La fila "Crear punto" de la matriz de arriba estaba marcada
DIVERGENTE deliberada (simplificación de UI válida) pero no se había medido
que además se perdía dato real — eso no es divergencia, es una regresión no
detectada hasta ahora porque la base de este repo estaba vacía (ver también
el hallazgo de `operativoData`/`getResiduos()` más abajo, mismo origen: nunca
hubo datos reales en pantalla para notar que faltaban).

**RESUELTO 2026-07-29.** Los 26 campos se quedan (ninguno se eliminó del
formulario — Josh confirmó "todos se quedan" tras revisar la lista). Columnas
propias agregadas a `PuntoResiduo` (no un campo JSON opaco — se eligió así a
propósito para poder reportar/consultar sobre estos datos y para que el
diccionario de datos de la entrega a UAESP no dependa de un blob ilegible):
migración versionada (`src/migrations/1785339722226-FormularioFijoPuntoAcumulacion.ts`,
generada y validada contra Postgres vacía local antes de aplicar en ningún
lado real, **corrida contra producción el 2026-07-29** (`Postgres-_hTA`,
verificada con `/api/health` y `/api/puntos` en 200/401 según corresponde),
entidad (`punto-residuo.entity.ts`), DTO compartido
(`dto/formulario-fijo-punto.dto.ts`, usado por `CreatePuntoDto` y
`UpdatePuntoDto`), persistencia real en `puntos.service.ts` (`create`/
`update`), y test de round-trip
(`puntos.service.spec.ts`: llena los 26 campos, crea el punto, lo vuelve a
leer del repositorio como haría la app al abrir el detalle, y confirma que
cada campo llega igual — 30/30 tests verdes).

### Datos personales (PII) — para el acta de entrega a la UAESP

Tres de los 26 campos contienen datos personales de ciudadanos, no de
funcionarios del distrito:

| Campo | Contenido |
|---|---|
| `nombreResponsable` | Nombre del establecimiento o persona identificada como generadora de los residuos. |
| `direccionResponsable` | Dirección de esa misma persona/establecimiento. |
| `telefonoActor` | Teléfono de un actor estratégico comunitario (JAC, comerciante, etc.), no necesariamente el generador. |

**Regla permanente:** el seed de desarrollo (ver más abajo) NUNCA debe llevar
valores reales en estos tres campos — solo datos ficticios, marcados como
tales. Cuando se escriba el diccionario de datos para el acta de entrega,
estos tres campos deben señalarse explícitamente como datos personales — es
la respuesta a la pregunta del acta sobre si lo entregado contiene datos
personales. El endpoint público (`GET /puntos/public/:id`, `toPublicPunto()`
en `puntos.service.ts`) no incluye ninguno de los 26 campos nuevos — quedan
fuera por omisión, no hace falta excluirlos a mano, pero cualquier futura
vista "pública" nueva debe revisar esta tabla antes de exponer campos del
punto.

### Cadena de evidencia para comparendos (campos #17 a #23)

`identificacionGenerador` → `tipoGenerador` → `nombreResponsable` →
`direccionResponsable` → `observoDisposicion` → `fechaObservacion` →
`metodoIdentificacion` forman un bloque único, no siete campos sueltos: si se
identificó al generador, los tres siguientes lo describen; los tres últimos
documentan CÓMO se llegó a esa conclusión (evidencia). **Quitar cualquiera de
los siete deja a los otros seis sin sentido** — si en el futuro alguien
propone eliminar uno por parecer redundante, debe revisar los seis restantes
primero. Mismo comentario dejado en el código (`punto-residuo.entity.ts`,
junto al enum `IdentificacionGenerador`).

## Pendiente de replicar

Prioridad alta:
1. ~~AdminDashboard shell + ruta `/admin`~~ RESUELTO 2026-07-27: `pages/admin/AdminDashboard.tsx` + `pages/admin/hooks/useAdminDashboard.ts` (hook propio, reducido — no el de 1400 líneas multi-dominio del hub) + ruta `/admin` en `App.tsx`, redirect de `LoginPage` para rol ADMIN. Verificado con backend real levantado (login, `GET /puntos` con token ADMIN) y `tsc`/`vitest` limpios.
2. **CRUD de usuarios en backend** — parcialmente resuelto 2026-07-28: `GET /users/:id` y `GET /users/gestores/list` ahora existen como proxy propio hacia el hub (`src/users/`, ver PLAN-MAESTRO.md HITO 2). Sigue pendiente `create/update/delete/import` — el frontend (`users.service.ts`) los invocaba sin backend, pero esos métodos ya se limpiaron como código muerto (commit `20114e1`, sin consumidores reales) antes de este fix. Si ADMIN necesita gestionar gestores/validadores desde este repo en el futuro, es trabajo nuevo, no una regresión a arreglar.
3. ~~Permitir edición de punto a VALIDADOR_AMBIENTAL/ADMIN~~ RESUELTO — ver fila "Editar punto" en la matriz de arriba, REPLICADA 2026-07-28.

Prioridad media:
4. ~~Recalculo automático de estado de `Proceso`~~ RESUELTO — ya estaba implementado en `puntos.service.ts:154` (equivalente a `sorver.controller.ts:486-488` del hub), esta fila del documento estaba desactualizada. Verificado 2026-07-28 con 2 tests nuevos (`puntos.service.spec.ts`) que confirman que `approve()` llama a `recalculateStatus` cuando el punto tiene `processId`, y que NO lo llama cuando no lo tiene.
5. ~~Corregir `process.service.ts` (frontend) — llama `/sorver/processes*`, backend real es `/procesos`.~~ **RESUELTO DE VERDAD 2026-07-29** (había sido marcado RESUELTO el 2026-07-27 sin que el código real llegara a `test` — mismo patrón que la fila ADMIN, causa raíz documentada arriba: commits `f6b6dcf`/`c30db0c` se hicieron en `version1`, nunca en `test`, ni siquiera se pushearon a `origin/version1`). `frontend/src/services/process.service.ts` (6 llamadas, sin consumidor real) y `frontend/src/components/SectorRecoleccionPanel.tsx` (2 llamadas, consumidor real: `gestor-ambiental/components/GeneralMapView.tsx`) repunteados a `/procesos*` y `/api/sectores/*`. Verificado contra el backend real desplegado: `GET /api/sectores/puntos` → 401 (guard, ruta existe) donde antes daba 404 con el prefijo `/sorver/`. `tsc`/`jest` (76/76)/`vitest` (128/128) verdes.

Prioridad baja / depende de decisión abierta:
6. Módulo `files` (subida de acta/fotos a R2) — ver Decisiones abiertas: no implementar hasta fase 2. **Análisis 2026-07-28** (solo investigación, sin implementar):
   - `frontend/src/services/files.service.ts` espera 3 endpoints que no existen en este backend: `POST /files/acta` (sube 1 PDF, devuelve `{success, key, url, message}`), `POST /files/photos` (sube N imágenes, devuelve `{success, keys, urls, count, message}`), `GET /files/:key` (URL firmada/pública de un archivo ya subido).
   - Consumidores reales: `components/ActaUpload.tsx` y `components/PhotosUpload.tsx`, usados desde `CreateActivity.tsx`, `EditActivity.tsx` y (solo `PhotosUpload`) `gestor-ambiental/components/SeguimientoModal.tsx` — es decir, TODO el flujo de creación/edición de puntos y de seguimiento de residuos depende de esto. Hoy, al no existir el backend, cualquier intento de subir un archivo real falla (probablemente 404, no se probó en runtime porque no hace falta ejecutar código para confirmar que el controller no existe).
   - Para implementarlo hace falta: un módulo NestJS `files/` con `FileInterceptor`/`FilesInterceptor` (mismo patrón que `hub/src/files/files.controller.ts`), credenciales de Cloudflare R2 **propias de ambiental** (no reusar el bucket/credenciales del hub — son servicios independientes), y las variables `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET_NAME`. Los roles que deberían poder subir son los mismos que ya usan `PATCH /puntos/:id/seguimiento`: `GESTOR_AMBIENTAL`, `VALIDADOR_AMBIENTAL`, `ADMIN`.
   - `frontend/src/services/survey.service.ts` — **no es un gap, no hace falta implementar nada acá.** Llama directo al microservicio externo `gov_encuestas_publico` (`VITE_SURVEYS_API_URL`, fallback hardcodeado a `backendencuestas-production-d973.up.railway.app`), nunca al backend de este repo. Consumidor único: `pages/CreateActivity.tsx:383` (`surveyService.getSurvey(...)` para traer el formulario dinámico de la encuesta del punto). Es el contrato cross-repo esperado por diseño del workspace (ver `CLAUDE.md` del workspace: "gov-espacio-publico CONSUME gov_encuestas_publico vía HTTP") — este repo hace lo mismo directo desde el frontend, sin pasar por su propio backend.
7. `bulk-delete` de puntos — ver Decisiones abiertas: no replicar hasta confirmar uso real.
8. ~~Assets KMZ de capas institucionales faltantes~~ RESUELTO 2026-07-27: ninguno de los archivos que `boundaryValidation.ts`, `BoundaryLayer.tsx`, `BarriosLayer.tsx`, `RecoleccionSectorLayer.tsx`/`useSectoresAmbiental.ts`, `GeneralMapView.tsx`, `ActivityDetailView.tsx` y `EnvironmentalTab.tsx` referencian existía en `frontend/public/` de este repo — carpetas `boundaries/` e `icons/` no existían. El código es idéntico al hub (diff vacío en `boundaryValidation.ts`); el problema era 100% de assets estáticos faltantes, con un único root-cause afectando MÚLTIPLES consumidores a la vez: la validación de "¿el punto cae dentro de Santa Fe/el barrio?" en `CreateActivity`/`EditActivity` fallaba en silencio (catch), y los mapas de gestor/validador/admin no mostraban ningún polígono de referencia. Copiados desde el hub (solo lectura ahí): 12 archivos KMZ/KML en `boundaries/` (`KMZ_Sectores_Catastrales_SF_2026.kmz`, `doc.kml`, `Carrera7.kmz`, `Capa_Colegios.kmz`, `Cestas (1).kmz`, `Vias_FalloSV_LaCapuchina.kmz`, `Vias_FalloSV_SantaInes.kmz`, `PropiedadHorizontal (1).kmz`, `UPZ_SantaFe.kmz`, `Capa_Cambuches.kmz`, `Capa_Bodegas.kmz`, `RecoleccionUrbana.kmz`) y `Residuos.png` en `icons/` (usado por `createPuntoCriticoIcon` en `gestor-ambiental/lib/icons.ts`, roto por la misma razón — mismo bug que ya se había corregido en `adminHelpers.ts` reemplazando por SVG inline, pero ahí no se tocó código, solo se trajo el asset real). Verificado sirviendo con el frontend levantado (`200` en los 5 archivos probados). Ninguno de estos 8+1 layers institucionales es exclusivo de ambiental (confirmado en el hub, son transversales) — se trajeron tal cual porque son datos de referencia geográfica, no código de dominio.

## Divergencias deliberadas

### Botón "Ver en Google Maps" en las vistas de detalle de punto
El hub no lo tiene. Se agregó primero en `PublicPuntoPage.tsx` (link directo
`https://www.google.com/maps?q={lat},{lng}`) y Josh pidió explícitamente
mantenerlo y llevarlo también a la vista de detalle de ADMIN — es una mejora
sobre el original, no un gap a cerrar. **No quitarlo ni "corregirlo" hacia el
hub en una futura auditoría de paridad.**

### Sin panel "Filtros del Mapa" separado del panel de "Filtros Globales" (ADMIN)
El hub tiene dos paneles de filtros idénticos en campos (Estado/Categoría/
Barrio/Turno/Mes/rango) porque tiene múltiples tabs (Actividades, Mapa,
Sector Ambiental) que necesitan estado de filtro independiente entre sí — si
compartieran un solo estado, cambiar de tab pisaría los filtros del otro.
Este repo no tiene tabs: es una sola vista. Un segundo panel con los mismos
5 campos, atado a un segundo estado paralelo, no tendría ningún efecto
funcional distinto — solo duplicaría UI. Decisión confirmada por Josh
2026-07-29: **no construirlo**, ni el botón "Filtros" del mapa por
consistencia visual. El panel único de Filtros Globales cubre ambos usos.

### Filtro de "Turno" no se portó al panel de Filtros Globales (ADMIN)
El hub filtra por `isNightShift` (diurno/nocturno), un campo que sí es real
en `ActivityEntity` del hub (seteado al crear la actividad). `PuntoResiduo`
de este repo no tiene ese campo — nunca existió, no es una omisión de
migración. Las 38 preguntas del formulario de creación de puntos
(`camposPuntoAcumulacion.ts`, verificado contra la encuesta viva el
2026-07-29) tampoco incluyen ninguna pregunta de turno/horario. Se decidió
**no mostrar el filtro** en vez de mostrarlo sin función: un filtro que
nunca cambia el resultado es peor que no tenerlo, hace creer al usuario que
está acotando cuando no pasa nada. Alternativa descartada (poblar el dato):
requeriría agregar una pregunta nueva al formulario y no hay ningún pedido
de negocio de la UAESP para capturar turno — no se justifica solo para
llenar un filtro.

### Consecuencia sistemática del modelo de datos
El hub usa `ActivityEntity` única discriminada por `operativoCategoria` /
`operativoSubtipo` / `operativoData`. Este repo usa `PuntoResiduo` dedicada,
donde toda fila ES ambiental y los residuos viven en `activity.residuos`
(top-level).

Por tanto, al portar CUALQUIER código del hub:
- Los filtros por `operativoCategoria === 'AMBIENTAL'` SE ELIMINAN. Son
  redundantes aquí y dejan las listas vacías.
- Las lecturas de `operativoData?.residuos` pasan a `activity.residuos`.
- Las lecturas de `operativoSubtipo` se adaptan o se eliminan según el caso.

Paridad = mismo comportamiento para el usuario, NO código idéntico. Copiar
literal un filtro del hub que aquí no aplica es romper la paridad, no lograrla.

Aplicado 2026-07-27 en `adminHelpers.ts` (`getResiduos`, `getPuntoCriticoTier`,
`isPuntoRecogido`, `getCategoryIcon`, `getAllLocations`) y `EnvironmentalTab.tsx`
— el filtro `a.operativoCategoria === 'AMBIENTAL'` dejaba la lista de puntos
del AdminDashboard siempre vacía contra datos reales; corregido a leer
`activity.residuos` directamente.

- **Entidad `PuntoResiduo` dedicada** en vez de `ActivityEntity` genérica discriminada por categoría (hub). Documentado ya en CLAUDE.md secciones 4-5 — no "corregir" hacia el modelo genérico del hub.
- **`CreateActivity` fijo a AMBIENTAL** en vez del formulario genérico multi-categoría del hub — simplificación correcta dado que este repo es mono-dominio.
- **`gestoresInvolucrados` como `uuid[]` plano** en vez de relación `ManyToMany` con tabla join (hub) — funcionalmente equivalente hoy. Queda anotado para la transformación de Fase 3, no se resuelve ahora.
- **`ValidadorDashboard`/`ValidadorMapaDashboard` dedicados** en vez de compartidos con VALIDADOR_PYBA — correcto, este repo no tiene el rol PYBA.
- **`EnvironmentalTabProps` reducida de 17 a 12 props** frente al hub: se eliminaron `getGlobalActivityIndex` (aquí cada punto ya trae `pointNumber` propio del backend, no hace falta calcular un índice dentro de una lista multi-dominio), `globalSubtipo` (solo alternaba entre subtipos de OTROS dominios; este repo tiene un único subtipo), y `setSelectedActivity`/`setShowDetailModal` (ya estaban muertas en el hub — ningún handler las llamaba). `setPointsSidebarOpen` pasó de prop del shell a estado local del propio tab, porque aquí solo hay un tab (en el hub el sidebar era compartido entre varios tabs del mismo shell).
- **Ícono de marcador con SVG embebido** en vez de PNG enmascarado (`createMarkerIcon`/`getCategoryIcon` en `adminHelpers.ts`) — el hub referencia `/icons/{IVC,EspacioPublico,Ambiental,Residuos}.png`, ninguno existe en este repo. Se reemplazó por el mismo patrón de ícono SVG de hoja que ya usa `gestor-ambiental/lib/icons.ts`, parametrizado por color.
- **Click de marcador/lista abre `/public/actividad/:id`** en vez de `/admin/actividad/:id` (hub) — esa ruta de detalle admin no existe en este repo; se reutiliza la vista pública de punto que sí existe.

## Decisiones tomadas

- Los 3 roles del enum (`GESTOR_AMBIENTAL`, `VALIDADOR_AMBIENTAL`, `ADMIN`) son el alcance completo — no agregar roles genéricos del hub (`GESTOR`, `VALIDADOR` sin sufijo) aunque el hub los use como fallback residual.
- `survey.service.ts` llama directo al microservicio externo de encuestas (`gov_encuestas_publico`, vía HTTP) — esto NO es un gap de este repo, es el contrato cross-repo esperado. No construir un módulo de encuestas propio aquí.
- La base de datos de desarrollo de este repo es propia (`ambiental` en `localhost`), separada de la del hub. `synchronize` está en `true` en desarrollo (`env.NODE_ENV !== 'production'`) pero no representa riesgo porque no apunta a la base del hub.
- `migrate-from-legacy.ts` es el embrión real de la Fase 3 (transformación de esquema, no copia 1:1) — no se ejecuta ni se toca hasta que Fase 1 y 2 estén cerradas.

## Fases posteriores (no trabajar aún)

### Fase 2 — Independencia de código
Auth propia, despliegue autónomo, variables de entorno completas.

Condición de salida:
- [x] `synchronize: false` y migraciones versionadas. CUMPLIDO 2026-07-28:
  producción ya tenía `synchronize: false`; se generaron migraciones TypeORM
  versionadas (`src/migrations/1785238458998-InitialSchema.ts`, commiteada) a
  partir de las entidades, y se corrieron contra `Postgres-_hTA` en Railway
  (la base de producción de ambiental, generada/validada primero contra una
  Postgres vacía local para no arriesgar nada). `GET /puntos` responde 200
  con lista vacía — esquema real, sin datos, sin `synchronize` de por medio.
  Pendiente menor: en LOCAL `synchronize` sigue en `true` (`env.NODE_ENV !==
  'production'`) — se deja así a propósito por ahora, la base de desarrollo
  sigue siendo desechable; cuando se quiera cerrar del todo, cambiarlo a
  `false` también en local y correr `npm run migration:run` ahí.

### Fase 3 — Migración de datos (NO trabajar hasta terminar fases 1 y 2)

Los datos históricos se migran desde la base de gov-espacio-publico a una base
propia del ambiental. Es TRANSFORMACIÓN de esquema, no copia:
`ActivityEntity` discriminada por categoría → `PuntoResiduo` dedicada.

Notas a tener presentes cuando llegue el momento:
- `gestoresInvolucrados`: allá es relación `ManyToMany` con tabla join, aquí es
  `uuid[]` plano. Requiere aplanado.
- Adjuntos (fotos, actas): definir si se mueven o se referencian.
- CALIDAD DE ORIGEN: un import desde Excel roto generó registros corruptos
  marcados con `results = 'Importado desde Excel'`. El endpoint
  `import-ambiental-excel` sigue roto en el hub. Contar y decidir qué se
  descarta ANTES de migrar; limpiar después cuesta el doble.
- El script debe ser versionado, repetible e idempotente: se correrá varias
  veces antes del corte real.
- Debe incluir reconciliación: conteos origen vs destino y muestreo. Una
  migración sin verificación no cuenta como hecha.
- Momento de corte: durante la transición solo un sistema escribe. Definir
  cuál y cuándo. DECISIÓN ABIERTA.

### Fase 4 — Reconexión a bogotaneidapp y apagado del legacy
DECISIÓN ABIERTA: cómo se conecta el módulo ya independiente al hub (consumo
por HTTP, microfrontend, u otra). No resolverla ahora, dejarla planteada.
Criterio de terminado del proyecto: se puede borrar
`gov-espacio-publico/packages/frontend/src/pages/gestor-ambiental/` sin romper
el hub.

## Definición de terminado del HITO 2

Lista finita, verificable en pantalla, con datos reales (seed de desarrollo,
no base vacía — ver "Pendiente de verificar" abajo). Cuando todas las
casillas estén marcadas, el hito se cierra, aunque queden detalles menores
sin resolver.

Auditoría 2026-07-29 (código, sin navegador): para cada casilla, qué está
confirmado por código/tests y qué sigue requiriendo verificación visual.

**GESTOR_AMBIENTAL:**
- [ ] Crea un punto llenando el formulario fijo completo, lo envía, y al
  reabrirlo ve exactamente lo que escribió, campo por campo. **CONFIRMADO POR
  CÓDIGO**: `puntos.service.spec.ts:40` llena los 26 campos, crea, relee del
  repositorio y confirma igualdad campo a campo (30/30 tests verdes). Los 38
  campos del formulario real (confirmado contra la encuesta viva en
  `Postgres-Encuestas`, ver sección "Formulario" abajo) tienen paridad 1:1 con
  `camposPuntoAcumulacion.ts` + el sub-formulario de residuo. **Falta
  verificación visual en pantalla** con datos reales (no solo el test).
- [ ] Agrega uno o más residuos (tipo, quién dispuso, olores, vectores, área,
  foto), y al reabrirlo cada residuo aparece completo con su foto visible.
  **CONFIRMADO POR CÓDIGO** para el dato (tests de creación con
  residuos/fotos, `puntos.service.spec.ts:168`; reemplazo de residuos,
  `:148`). **La foto visible en pantalla no está verificada** — ningún test
  cubre que la URL de la foto renderice una imagen real.
- [ ] Tiene una ruta semanal activa, la cierra o cancela, y el historial la
  refleja correctamente. **CONFIRMADO POR CÓDIGO Y TEST**
  (`rutas-semanales`: `cancelarRuta` funciona para el dueño, rechaza para
  terceros, resultado queda en `estado: 'cancelada'`). **Falta verificación
  visual.**

**VALIDADOR_AMBIENTAL:**
- [ ] Ve un punto enviado por un gestor con el nombre real del creador
  resuelto. **CONFIRMADO POR CÓDIGO**: `ValidadorActividadPanel.tsx` llama
  `usersService.getUserById`, proxy con cache TTL 60s y timeout de 4s contra
  el hub (`users.service.ts`). **Falta verificación visual.**
- [ ] Aprueba un punto y el cambio se refleja en el mapa/dashboard del gestor.
  **CONFIRMADO POR CÓDIGO** con una precisión: `GestorAmbientalDashboard`
  carga `GET /puntos` (TODOS los puntos del sistema, sin filtrar por
  creador/asignación — `useGestorAmbiental.ts:118`), así que cualquier cambio
  de estado aparece en el próximo fetch/recarga de cualquier gestor, no solo
  el creador — no hay push en tiempo real (ni falta, es fetch-on-load como el
  resto de la app). **Falta verificación visual.**
- [ ] Rechaza un punto con notas de validación, visibles para el gestor.
  **CONFIRMADO POR CÓDIGO**: `reject()` guarda `validationNotes`
  (`puntos.service.ts:214-220`), `ActivityDetailView.tsx:331` las renderiza
  condicionalmente. **Falta verificación visual.**
- [ ] Marca un sector como recogido y el estado se refleja en el panel de
  sector de recolección. **CONFIRMADO POR CÓDIGO 2026-07-29** — estaba roto
  (404, ver "Pendiente de replicar" ítem 5 para la causa raíz completa),
  arreglado el mismo día y verificado contra el backend real desplegado
  (`GET /api/sectores/puntos` → 401, ya no 404). **Falta verificación
  visual.**

**ADMIN:**
- [ ] Ve indicadores agregados que reflejan datos reales. **CONFIRMADO POR
  CÓDIGO**: `IndicadoresAmbientalPanel.tsx` lee `actividades` directo (bug de
  `operativoCategoria`/`operativoSubtipo` siempre-falso ya corregido
  2026-07-29, ver sección de regresión arriba). **Falta verificación visual**
  de que las cifras concretas (cámaras, tipo de zona) coincidan con los 346
  puntos reales.
- [ ] Asigna un punto sin gestor a un gestor específico, y la asignación se
  refleja en el panel de asignación y en el dashboard del gestor.
  **CONFIRMADO POR CÓDIGO**: `PATCH /asignaciones/punto` existe
  (`asignaciones.controller.ts:31`); el dashboard del gestor ya muestra TODOS
  los puntos del sistema (ver nota arriba), así que el punto recién asignado
  es visible sin lógica adicional. **Falta verificación visual.**
- [ ] La lista de gestores para asignar muestra solo gestores ambientales.
  **CONFIRMADO POR CÓDIGO**: `AsignacionPuntosPanel.tsx` obtiene gestores en
  fetch separado (desacoplado del resto del panel, corregido 2026-07-28) y el
  backend (`GESTOR_AMBIENTAL` → hub ya filtra) mantiene el filtro por rol.
  **Falta verificación visual con datos reales.**

**Transversal (los 3 roles):**
- [ ] Nombre real de usuario en toda vista, no ID ni placeholder de error.
  **CONFIRMADO POR CÓDIGO** vía el proxy de usuarios con cache (ver arriba) —
  cubre creador, gestor asignado y validador (`revisadoPorNombre` es columna
  propia, no requiere proxy). **Falta verificación visual con el seed
  cargado.**

**Resumen:** 11 de 11 casillas confirmadas por código/tests (la de "marcar
sector recogido" estaba rota y se arregló el mismo día, ver arriba),
pendientes solo de verificación visual — ninguna herramienta de navegador
disponible en esta sesión.

## Segunda regresión detectada y corregida 2026-07-29: `operativoSubtipo`/`operativoCategoria` siempre falsos

Con datos reales ya migrados desde el hub (346 puntos), se auditaron las
vistas de los 3 roles usando tokens JWT reales contra `ambiental-backend`
en producción (sin navegador disponible esta sesión — auditoría a nivel de
API + lectura de código, no captura de pantalla). Se encontró que
`activity.operativoSubtipo`/`operativoCategoria` son campos que **nunca
existen** en este backend (son residuo del tipo `Activity` del hub, copiado
sin querer al frontend de ambiental) — cualquier código que los lee está
comparando contra `undefined` y siempre toma la rama falsa. Se encontraron
15 archivos con este patrón. Se corrigieron los 12 que causaban una sección
vacía o rota en pantalla; se dejaron 3 sin tocar por ser inofensivos.

**Corregidos (comportamiento estaba siempre vacío/roto, ahora correcto):**
`gestor-ambiental/lib/residuos.ts` (getResiduos/isPuntoEmergencia/isPuntoRecogido),
`admin/utils/adminHelpers.ts` (getCategoryIcon, getPuntoCriticoTier,
getAllLocations), `gestor-ambiental/components/ActivityDetailView.tsx`
(botón "Actualizar punto" bloqueado para TODOS los gestores, bloque de
"Información del Punto" siempre oculto, ícono de marcador),
`gestor-ambiental/hooks/useGestorAmbiental.ts` (8 gates distintos — entre
ellos el filtro de la lista lateral por defecto, que **siempre daba
vacía**, y el filtro Recogidos/Pendientes, que nunca filtraba nada),
`gestor-ambiental/components/ActivitySidebar.tsx` y `GeneralMapView.tsx`
(marcadores de punto crítico), `gestor-ambiental/components/
PerfilGestorView.tsx` (estadísticas del perfil siempre en cero),
`admin/tabs/environmental/IndicadoresAmbientalPanel.tsx` (indicadores del
panel admin siempre en cero — el síntoma que el usuario pidió verificar
explícitamente), `gestor-ambiental/hooks/useActividadesCalor.ts` (lista de
"actividades en calor" y auto-marcado de ordinarios), `gestor-ambiental/
hooks/useRutaAmbiental.ts` (candidatos del planificador de ruta siempre
vacíos).

**Dejados sin tocar (no rompen nada visible, documentados por si alguien
los revisita):**
- `ValidadorMapaDashboard.tsx` — envía `operativoCategoria`/`operativoSubtipo`
  como query params a `activityService.getAll()`; el controller
  (`puntos.controller.ts`) solo lee `desde`/`hasta`, los ignora.
- `PublicPuntoPage.tsx` — campo de tipo `operativoSubtipo: string | null`
  declarado pero nunca leído.
- `operativoSubtiposCatalog.ts` / `utils/activityLabels.ts` /
  `ClickableMarker.tsx` — `getActivityTipoLabel()` cae a
  `activity.activityType` (tampoco existe) y siempre da `''` en el label
  del popup del mapa; gap cosmético menor, no solicitado explícitamente.

Verificado tras el arreglo: `tsc --noEmit` limpio, 128/128 tests frontend y
76/76 tests backend en verde, y contra producción real (346 puntos, 345 con
residuos, 71 con al menos un campo del formulario fijo poblado — el resto
son puntos históricos migrados del hub sin esas respuestas en
`dynamicAnswers`).

## Integridad de datos migrados (verificado 2026-07-29 contra `Postgres-_hTA`, SOLO LECTURA)

Consulta directa (`SELECT`/`COUNT`, sin exportar filas) contra la base de
producción de ambiental, autorizada explícitamente por Josh para este
chequeo puntual.

- `puntos_residuo`: **346** filas (coincide con la migración).
- **Ninguna de las 26 columnas nuevas del formulario fijo quedó en 0** — la
  migración mapeó las 26. Conteo de registros con valor no nulo por columna:

| Columna | Poblados / 346 | Columna | Poblados / 346 |
|---|---|---|---|
| `frecuenciaAcumulacion` | 63 | `identificacionGenerador` | 59 |
| `observaciones` | 112 | `tipoGenerador` | 57 |
| `entornoEscolar` | 69 | `nombreResponsable` | 16 |
| `nombreEntornoEscolar` | 28 | `direccionResponsable` | 15 |
| `especificarEntorno` | 22 | `observoDisposicion` | 55 |
| `tipoZona` | 69 | `fechaObservacion` | **1** |
| `tipoSuelo` | 66 | `metodoIdentificacion` | 40 |
| `condicionesZona` | 43 | `actoresEstrategicos` | 21 |
| `poblacionHabitanteCalle` | 64 | `telefonoActor` | 14 |
| `factoresAcumulacion` | 50 | `intervencionesRecomendadas` | 51 |
| `camarasPunto` | 67 | | |
| `operadorAseo` | 65 | | |
| `recoleccionPuertaAPuerta` | 51 | | |
| `m2Invasion` | 57 | | |
| `actoresIndisciplina` | 54 | | |
| `intervencionesPropuestas` | 52 | | |

**`fechaObservacion` investigado 2026-07-29 — NO es bug de migración.**
Consulta SOLO LECTURA contra el hub (solo la clave `fechaObservacion` de
`dynamicAnswers`, nunca el objeto completo — sin exponer PII): el hub mismo
tiene exactamente **1** actividad `AMBIENTAL` con esa clave no vacía, valor
`"2026-07-15T10:40"` (formato válido, se parsea sin problema). La migración
migró correctamente el único valor que existe en el origen — el dato
simplemente casi nunca se llenó al registrar el punto en el hub. No requiere
arreglo de código ni re-migración.

**Residuos: 1087 en ambiental, coincide exacto con el hub HOY.** Comparación
punto por punto (por `id`, solo conteo de residuos, nunca contenido —
`jsonb_array_length`, sin exponer datos de residuo): **346/346 puntos
coinciden, 0 huérfanos, 0 puntos con conteo distinto, suma total idéntica
(1087 = 1087) en ambos lados.** El "1082" de la línea base de HITO 3 (más
abajo) fue una foto fija tomada el 2026-07-28 — el hub sigue siendo el
sistema productivo en uso y ganó 5 residuos nuevos en el día siguiente por
actividad real de gestores, no por duplicación ni por restos de la corrida
parcial que se borró. La migración de residuos está limpia y al día.

**Rutas y asignaciones:** `ruta_semanal` = **12** (coincide). `punto_asignacion`
= **345** (coincide, 1 punto sin asignar, ya documentado).

## Formulario: 38 preguntas vs encuesta viva (verificado 2026-07-29, SOLO LECTURA)

Consulta directa a `Postgres-Encuestas` (autorizada por Josh) contra la
encuesta real en producción (`id=65045573-d85b-48fe-aae0-2d8692c1b1e9`,
"AMBIENTAL - Identificación de Puntos de Acumulación de Residuos") — no
contra el seed de código, que resultó estar desactualizado (ver hallazgo
abajo). **38 preguntas confirmadas** (33 preguntas + 5 encabezados de
sección).

**Paridad: 29/29 preguntas a nivel de punto tienen match exacto** en
`camposPuntoAcumulacion.ts` (tipo de campo, opciones, `required`,
`visibleIf`) — mismo nombre técnico, mismas opciones en el mismo orden,
misma obligatoriedad, misma condicionalidad. Las 4 preguntas restantes de las
38 (`tipoResiduo`, `percibeOlores`, `percibeVectores`, `areaLinealMetros`)
son a nivel de residuo individual, no de punto — viven correctamente en el
sub-formulario de residuo de `CreateActivity.tsx`, tal como documenta el
comentario del propio archivo. **Sin pérdida de campos, sin divergencia de
tipo/opciones/obligatoriedad/condicionalidad en ninguna de las 38.**

**Hallazgo cross-repo (no es de este repo, documentado en
`gov-espacio-publico/DEUDA-TECNICA.md` ítem 10, rama
`docs/deuda-encuestas-seed-drift`, commiteado sin pushear):** el seed de
código de `gov_encuestas_publico`
(`puntosAcumulacion.questions.ts`) no reproduce la encuesta real — le faltan
6 preguntas que sí existen en producción (`especificarEntorno`,
`operadorAseo`, `recoleccionPuertaAPuerta`, `m2Invasion`,
`actoresIndisciplina` a nivel de punto, `intervencionesPropuestas`) y le
sobran 2 que ya no existen en producción (`fotos_evidencia`,
`entidades_acompanantes`). No afecta a este repo — el formulario fijo de
ambiental se capturó de la encuesta viva real, no del seed — pero si alguien
reseedea esa encuesta alguna vez, perdería estructura real sin darse cuenta.

## Pendiente de verificar (sin navegador esta sesión)

Lo anterior confirma, a nivel de código + API, que los tres síntomas que
el usuario pidió revisar ya no deberían darse: las respuestas migradas SÍ
llegan al frontend (antes el gate las ocultaba), los residuos SÍ deberían
aparecer en listas/mapa (antes las listas base ya venían vacías por el
mismo bug), y los indicadores del panel admin SÍ deberían mostrar cifras
(antes el filtro los vaciaba). **No se verificó por captura de pantalla en
navegador real** — no hay herramienta de navegador disponible esta sesión.
Queda como pendiente de verificación visual explícita antes de marcar
cerradas las casillas de "Definición de terminado del HITO 2" de arriba:

- Mapa general gestor, lista lateral de puntos críticos, planificador de
  ruta / ruta activa / segmento / historial, dashboard validador, mapa de
  residuos validador, panel admin de indicadores + asignación de puntos.

Confirmadas independientemente (verificación reciente con datos/flujo
real, no solo código): edición de punto (con tests dedicados), esquema de
base de datos (migraciones corridas contra producción), proxy de usuarios
(probado contra el hub real con tokens reales), handoff (probado de punta
a punta contra los subdominios reales), lectura de datos migrados vía API
con tokens reales de los 3 roles.

## Decisiones abiertas

| Decisión | Default mientras no se resuelva | Quién decide |
|---|---|---|
| Módulo files / almacenamiento R2 | No implementar nada nuevo. Documentar cómo se suben adjuntos hoy y dejarlo igual hasta la fase 2. | Josh |
| ¿bulk-delete se usa realmente? | No replicar hasta confirmar que alguien lo usa en producción. Si nadie lo usa, queda fuera de alcance. | Josh |
