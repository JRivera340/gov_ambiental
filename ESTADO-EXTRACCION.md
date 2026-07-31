# Extracción del módulo ambiental — estado
Última actualización: 2026-07-31 (5 hallazgos del primer recorrido visual real de Josh, resueltos: módulo files S3-compatible implementado y en producción, formulario de Puntos de Acumulación anidado correctamente, subtipo AMBIENTAL genérico restaurado con modelo de datos propio, bug de ruta que nunca marcaba visitado corregido, botón "Volver al Panel" del validador que rebotaba a sí mismo eliminado — ver "PUNTO DE RETOMA" al final para el detalle completo y lo pendiente)

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
| Mapa general gestor | GESTOR_AMBIENTAL | `/gestor-ambiental/dashboard` (`GeneralMapView`) | igual | CÓDIGO COMPLETO 2026-07-30 (diff contra hub, sin faltantes) — PENDIENTE VERIFICACIÓN VISUAL | Diff línea por línea confirma paridad de código; falta pasarla por navegador |
| Planificador ruta / ruta activa / segmento / historial | GESTOR_AMBIENTAL | viewModes del dashboard | igual (viewMode extra `historial`) | CÓDIGO COMPLETO 2026-07-30 (diff idéntico al hub en `PlanificadorRutaView`/`RutaActivaView`/`HistorialRutasView`) — PENDIENTE VERIFICACIÓN VISUAL | Diff confirma paridad de código; falta pasarla por navegador |
| Crear punto | GESTOR_AMBIENTAL | `CreateActivity` genérico multi-categoría, subtipos "Ambiental" y "Puntos de Acumulación de Residuos" | `CreateActivity` con selector de subtipo real (2026-07-31): "Puntos de Acumulación" (formulario fijo, 26 columnas propias) y "Ambiental" genérico (formulario fijo, 7 contadores + campos compartidos vía `tipoOperativo`) | RESUELTO 2026-07-31 — ver "Hallazgos del recorrido visual 2026-07-30" abajo | Falta verificación visual en navegador con datos reales (subida de foto real end-to-end) |
| Editar punto | GESTOR_AMBIENTAL, VALIDADOR_AMBIENTAL, ADMIN | permite editar a validador/admin | `PATCH /puntos/:id` permite los 3 roles; GESTOR_AMBIENTAL sigue restringido a lo suyo, VALIDADOR_AMBIENTAL/ADMIN pueden editar cualquier punto | PENDIENTE DE VERIFICACIÓN VISUAL | El permiso backend está probado con tests; la pantalla no se comparó |
| Perfil del gestor | GESTOR_AMBIENTAL | `PerfilGestorView` (hub) | igual | CÓDIGO COMPLETO 2026-07-30 (diff contra hub, solo adaptaciones mono-dominio documentadas) — PENDIENTE VERIFICACIÓN VISUAL | Diff confirma paridad de código; falta pasarla por navegador |
| Dashboard validador / Mapa de residuos validador | VALIDADOR_AMBIENTAL | `/validador/dashboard` (`ValidadorDashboard.tsx`) + `/validador/residuos` (`ValidadorMapaDashboard.tsx`) | **CORREGIDO 2026-07-31 — la fila de abajo (2026-07-30) decía "CÓDIGO COMPLETO" para `ValidadorDashboard.tsx` sin que el archivo existiera en este repo** (`/validador/dashboard` era un `<Navigate>` a `/validador/residuos`, mismo componente para ambas rutas). Mismo patrón "resuelto en docs / roto en código" ya documentado para la fila ADMIN — ver "Familia de bugs" más abajo. Detectado por Josh en el recorrido visual, no por auditoría de código. `ValidadorDashboard.tsx` porteado de verdad 2026-07-31 (ver sección propia más abajo). | RESUELTO 2026-07-31 — `ValidadorDashboard.tsx` ahora existe, mono-dominio | Falta verificación visual real en navegador (no repetir el error de marcarlo RESUELTO solo por existencia de código) |
| Detalle del validador (`ValidadorActivityDetailPage.tsx`) | VALIDADOR_AMBIENTAL | mismo `ActivityDetail.tsx` que ADMIN, con permisos de rol distintos | mismo `PuntoDetailView.tsx` que ADMIN (componente compartido) | RESUELTO 2026-07-30 — hereda el porte completo de la fila "Detalle de punto"; `canEdit`/`canApprove`/`canReject` confirmados correctos para `VALIDADOR_AMBIENTAL` (`activity.status === 'ENVIADA'`) | Nada — ver limitaciones ya anotadas en "Detalle de punto" (Re-validar/Eliminar) |
| Vista pública de punto | público | `GET /sorver/public/actividad/:id` | `GET /puntos/public/:id` | PENDIENTE DE VERIFICACIÓN VISUAL | Nunca comparada pantalla contra pantalla. Bug corregido 2026-07-30: `toPublicPunto()` no incluía `dateTime` por residuo, dejaba en 0/"No registrada" el cálculo de días desde recolección |
| Detalle de punto (admin/validador, `PuntoDetailView.tsx`) | ADMIN, VALIDADOR_AMBIENTAL | `ActivityDetail.tsx` (componente multi-dominio compartido) | `PuntoDetailView.tsx` (componente propio, mono-dominio) | RESUELTO 2026-07-30 — porteado completo desde el hub: N° Punto, Tipo de Actividad, Reportado por, Estado, Datos Operativo (equivalente fijo), Volumen por residuo, "Residuos Recogidos (N)" con evidencias, Gestores Participantes, Descripción General, Ubicación en grados, Información de Validación, acción "Marcar recogido" | "Re-validar" y "Eliminar" no portados — requieren endpoints de backend que no existen aquí (`POST /:id/send` sin restricción de owner para ADMIN, `DELETE /puntos/:id`); "Agregar residuo nuevo" en seguimiento tampoco portado |
| Admin — asignación de puntos + indicadores | ADMIN | montado en `/admin/dashboard` (tab `EnvironmentalTab`, uno de varios tabs multi-dominio) | `AdminDashboard.tsx` propio (un solo tab, mono-dominio) + ruta `/admin` | **RESUELTO 2026-07-30 — verificado contra código real, ver nota abajo** | Nada pendiente de esta lista; queda solo verificación visual en navegador |

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

**Corregido — verificado 2026-07-30 contra el código real de `test` (no contra
este documento, que había quedado desactualizado el mismo día que se generó
esta lista):** todo lo listado arriba como pendiente ya estaba implementado
antes de esta sesión — quedó sin reflejar en este documento. Evidencia
puntual: encabezado institucional en `pages/admin/AdminDashboard.tsx:19-46`
(degradado rojo, logo, "Sistema de Seguimiento Territorial · Panel de
Administración"); panel de Filtros Globales completo en el mismo archivo
líneas 48-143 (Estado/Tipo/Barrio/Mes/Desde-Hasta + Limpiar/Aplicar, atado a
`useAdminDashboard.ts`); sidebar "Lista de Residuos" completo en líneas
145-200 (contador real, buscador #, filtro Barrio, tabs Recogidos/
Pendientes, lista con #/barrio/fecha/"Ver detalle"); ruta
`/admin/actividad/:id` existe en `App.tsx:95-96` → `AdminActivityDetailPage`
(heredado del port de la vista de detalle compartida, commit `abeb67d`) —
"Ver detalle" ya no rompe; `useAdminDashboard.ts:39` cuenta puntos
(`status === 'PUBLICADA'`) para "Ident.", no entradas de residuo, y línea 73
cuenta `ENVIADA || APROBADA` para "Val." — los 2 bugs de cálculo ya no
existen. `tsc --noEmit` y la suite completa (76/76 backend, 158/158
frontend) verdes al momento de esta verificación.

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

### Columnas compartidas entre `tipoOperativo` — precisión para el diccionario de datos UAESP

`PuntoResiduo` reutiliza 6 columnas entre los dos subtipos de operativo
(`PUNTO_ACUMULACION`/`GENERICO`, ver más abajo) en vez de duplicarlas —
decisión de Josh 2026-07-31: "duplicar columnas con el mismo significado es
peor que reutilizarlas". Verificado el código real (frontend + migración)
para las 6, campo por campo:

- **`photos`, `actaPdfUrl`, `entidadResponsable`, `gestoresInvolucradosIds`**:
  mismo significado en ambos subtipos — evidencia fotográfica general,
  acta PDF, entidad responsable, gestores acompañantes. Sin ambigüedad.
- **`isGroupOperativo`**: mismo significado ("¿operativo en grupo?"), pero se
  DERIVA distinto según el subtipo — en `GENERICO` viene de una pregunta
  explícita del formulario ("¿Este operativo fue realizado en grupo...?");
  en `PUNTO_ACUMULACION` no existe esa pregunta, se infiere solo de si hay
  gestores acompañantes cargados (`gestoresInvolucradosIds.length > 0`).
  Mismo campo, mismo significado final, distinto origen del dato — no es
  ambiguo, pero vale la nota para quien audite el dato.
- **`results` — ESTE SÍ TIENE SIGNIFICADO DISTINTO SEGÚN EL ORIGEN DE LA FILA,
  no solo según `tipoOperativo`. Requiere lectura atenta antes de usarse en
  cualquier reporte o exportación:**
  - **Filas `GENERICO` (creadas en este repo):** contiene la "Descripción
    general" del formulario del operativo (sección 5, campo obligatorio) —
    siempre poblado.
  - **Filas `PUNTO_ACUMULACION` migradas del hub (346 puntos históricos,
    HITO 3):** contiene la "descripción general" ORIGINAL de la actividad
    en el hub (`activities.results`, poblado ahí para cualquier subtipo,
    con default `'Sin descripción'` si el usuario no escribía nada) —
    migrado verbatim, dato real y con contenido.
  - **Filas `PUNTO_ACUMULACION` creadas NUEVAS en este repo (después de la
    conversión a formulario fijo, 2026-07-29):** **siempre `null`.** El
    formulario fijo de puntos de acumulación (`camposPuntoAcumulacion.ts`)
    no tiene ningún campo que alimente `results` — ni `CreateActivity.tsx`
    ni `EditActivity.tsx` lo escriben para este subtipo. El campo más
    parecido, `observaciones`, es una columna DISTINTA con alcance distinto
    ("Observaciones adicionales sobre el punto de acumulación", ver sección
    "2. Datos del punto"), no un reemplazo de `results`.
  - **Consecuencia práctica:** una consulta que agrupe por `results IS NULL`
    hoy mezclaría "punto de acumulación nuevo sin ese dato" (esperado, no es
    un hueco) con cualquier fila realmente incompleta — hay que filtrar por
    `tipoOperativo` y por fecha de creación (antes/después de 2026-07-29)
    para interpretar un `results` nulo correctamente. Anotar esta regla en
    el diccionario de datos de la UAESP tal cual está escrita acá, no
    simplificarla a "campo de descripción general".

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
6. ~~Módulo `files` (subida de acta/fotos a R2)~~ **RESUELTO 2026-07-31** — módulo NestJS `src/files/` implementado con cliente S3-compatible (`@aws-sdk/client-s3`, no específico de R2 — endpoint/región/credenciales 100% por variables de entorno, falla al arrancar si faltan). Endpoints `POST /files/acta`, `POST /files/photos`, `GET /files/:key` con los mismos límites del hub (PDF ≤10MB, fotos JPG/PNG/WebP ≤10MB c/u, máx. 5 por request). Usa el MISMO bucket que el hub (`gov-espacio-publico-files`) con las credenciales R2 ya rotadas, vía variables `S3_*` propias en Railway (`ambiental-backend`). 10 tests nuevos (`files.service.spec.ts`). Desplegado y verificado en producción (`POST /api/files/photos` sin token → 401, no 404 — ruta registrada y guardada). Pendiente: verificación visual de que una foto real subida se vea al reabrir el punto (necesita browser, no se pudo esta sesión).
   - `frontend/src/services/survey.service.ts` — **no es un gap, no hace falta implementar nada acá.** Llama directo al microservicio externo `gov_encuestas_publico` (`VITE_SURVEYS_API_URL`, fallback hardcodeado a `backendencuestas-production-d973.up.railway.app`), nunca al backend de este repo. Consumidor único: `pages/CreateActivity.tsx:383` (`surveyService.getSurvey(...)` para traer el formulario dinámico de la encuesta del punto). Es el contrato cross-repo esperado por diseño del workspace (ver `CLAUDE.md` del workspace: "gov-espacio-publico CONSUME gov_encuestas_publico vía HTTP") — este repo hace lo mismo directo desde el frontend, sin pasar por su propio backend.
7. `bulk-delete` de puntos — ver Decisiones abiertas: no replicar hasta confirmar uso real.
8. ~~Assets KMZ de capas institucionales faltantes~~ RESUELTO 2026-07-27: ninguno de los archivos que `boundaryValidation.ts`, `BoundaryLayer.tsx`, `BarriosLayer.tsx`, `RecoleccionSectorLayer.tsx`/`useSectoresAmbiental.ts`, `GeneralMapView.tsx`, `ActivityDetailView.tsx` y `EnvironmentalTab.tsx` referencian existía en `frontend/public/` de este repo — carpetas `boundaries/` e `icons/` no existían. El código es idéntico al hub (diff vacío en `boundaryValidation.ts`); el problema era 100% de assets estáticos faltantes, con un único root-cause afectando MÚLTIPLES consumidores a la vez: la validación de "¿el punto cae dentro de Santa Fe/el barrio?" en `CreateActivity`/`EditActivity` fallaba en silencio (catch), y los mapas de gestor/validador/admin no mostraban ningún polígono de referencia. Copiados desde el hub (solo lectura ahí): 12 archivos KMZ/KML en `boundaries/` (`KMZ_Sectores_Catastrales_SF_2026.kmz`, `doc.kml`, `Carrera7.kmz`, `Capa_Colegios.kmz`, `Cestas (1).kmz`, `Vias_FalloSV_LaCapuchina.kmz`, `Vias_FalloSV_SantaInes.kmz`, `PropiedadHorizontal (1).kmz`, `UPZ_SantaFe.kmz`, `Capa_Cambuches.kmz`, `Capa_Bodegas.kmz`, `RecoleccionUrbana.kmz`) y `Residuos.png` en `icons/` (usado por `createPuntoCriticoIcon` en `gestor-ambiental/lib/icons.ts`, roto por la misma razón — mismo bug que ya se había corregido en `adminHelpers.ts` reemplazando por SVG inline, pero ahí no se tocó código, solo se trajo el asset real). Verificado sirviendo con el frontend levantado (`200` en los 5 archivos probados). Ninguno de estos 8+1 layers institucionales es exclusivo de ambiental (confirmado en el hub, son transversales) — se trajeron tal cual porque son datos de referencia geográfica, no código de dominio.

## Familia de bugs "ruta referenciada que no existe" — CERRADA 2026-07-30

Apareció 4 veces en sesiones distintas (fila ADMIN, `/api/sorver/sectores`,
`/api/procesos`, `/validador/actividad/:id`) antes de auditarla
sistemáticamente. Auditoría completa 2026-07-30, frontend y backend:

**Frontend — toda referencia interna (`navigate()`, `<a href>`, `window.open`)
contra `App.tsx`:** 0 rutas rotas. Últimas 2 cerradas esta sesión:
- `/dashboard` en `CreateActivity.tsx` (líneas 432/447 — justo después de
  crear un punto y en el botón "volver", la acción más frecuente del rol más
  usado) → corregido a `/gestor-ambiental/dashboard`, verificado contra el
  destino real del hub (`dashboardPath` en su `CreateActivity.tsx`, mismo
  valor para `GESTOR_AMBIENTAL`).
- `/validador/actividad/:id` (`ValidadorActividadPanel.tsx`,
  `ValidadorMapaDashboard.tsx`) → página nueva, ver más abajo.

**Backend — toda llamada de `frontend/src/services/*.ts` contra los
controllers de `src/*/*.controller.ts`:** 0 endpoints rotos. Las 2 únicas
llamadas sin backend real son conocidas y no son bugs:
- `/files/acta`, `/files/photos`, `/files/:key` — módulo no implementado a
  propósito (decisión abierta, ver tabla al final de este documento).
- `/auth/login` — `authService.login()` sin consumidor en `test`/`main`/
  `production` (no hay `LoginPage` acá, la sesión llega por `/handoff`), pero
  **sí tiene consumidor real en `version1`** (`LoginPage.tsx` +
  `POST /auth/login` propio, confirmado 2026-07-29) — no se borra, solo
  queda sin uso en esta rama, documentado en el propio archivo.

**Cómo repetir el chequeo** (para que cualquiera lo corra, no solo yo):
```bash
# Frontend: toda referencia interna
grep -rn "navigate(['\"\`]\|window\.open(\|href={\`\|href=\"" frontend/src \
  --include=*.tsx --include=*.ts | grep -v "\.test\.\|google\.com\|openstreetmap\|maps?q=\|mailto:\|tel:"
# comparar cada ruta resultante contra: grep -n 'path=' frontend/src/App.tsx

# Backend: toda llamada de servicio
grep -rn "api\.\(get\|post\|patch\|put\|delete\)\|fetchAuthJSON(" frontend/src/services frontend/src/components \
  --include=*.ts --include=*.tsx | grep -v "\.test\."
# comparar cada endpoint contra: grep -n "@Get\|@Post\|@Patch\|@Put\|@Delete\|@Controller" src/*/*.controller.ts
```

## Las cifras del panel ADMIN excluyen puntos fuera del área oficial de recolección (2026-07-30)

**Motivo, para que nadie lo cuestione dentro de 6 meses al no cuadrar un
número:** el Panel de Control (Ident./Recog./Tasa/Actividades/Pub/Val/Rech)
replica la misma semántica del hub, confirmada consulta por consulta contra
`useAdminDashboard.ts` del hub (SOLO LECTURA) — no es una elección propia de
este repo, es paridad exacta con el original:

1. **Filtro geográfico**: solo cuentan los puntos cuyo `lat/lng` caen dentro
   de al menos un polígono de `RecoleccionUrbana.kmz`. El mapa y la lista de
   puntos siguen mostrando TODOS los puntos filtrados, dentro o fuera del
   área — el filtro geográfico es exclusivo del Panel de Control, igual que
   en el hub (`ambientalInsightsData` ahí filtra, `filteredMapActivities`
   no). Implementado en `useAdminDashboard.ts`, función pura exportada
   `filterByGeoSectors()`, testeada (3 casos, incluida la validación de
   coordenadas inválidas).
2. **Rango de fecha por defecto**: 1 de enero a 31 de diciembre del año en
   curso, siempre activo por defecto (mismo default que `globalDateFrom`/
   `globalDateTo` del hub, que ahí nunca están "apagados"). Sin este
   default, hoy no cambiaba nada (los 346 puntos son de 2026), pero en enero
   el hub pasaría a contar solo el año nuevo y este panel seguiría contando
   todo el histórico — iban a divergir solos sin que nadie lo tocara.
   `getYearStart()`/`getYearEnd()` en `adminHelpers.ts`, mismo default en
   `clearFilters()` y en el reset del selector de mes.

**Los 4 puntos que quedan fuera del área oficial hoy** (calculado corriendo
el point-in-polygon real contra `RecoleccionUrbana.kmz`, no una estimación):

| # | Barrio | Estado | Lat | Lng |
|---|---|---|---|---|
| 76 | RAMIREZ | PUBLICADA | 4.5843689 | -74.0758828 |
| 224 | EL GUAVIO | PUBLICADA | 4.591317860704099 | -74.07063782209663 |
| 239 | LOS LACHES | PUBLICADA | 4.582421057068604 | -74.06697038355752 |
| 295 | RAMIREZ | PUBLICADA | 4.5810215 | -74.0774938 |

**Estos 4 puntos existen, tienen residuos registrados, y hoy no aparecen en
ninguna cifra del panel de administración de ninguno de los dos sistemas**
(ni del hub, ni de este repo) — nadie les hace seguimiento agregado, aunque
siguen siendo visibles en el mapa y en la lista de puntos. Dos hipótesis sin
resolver, **no se tocan los datos, solo se señala**:
- El punto se ubicó mal al registrarlo (lat/lng por fuera del barrio real).
- El polígono de `RecoleccionUrbana.kmz` está incompleto y no cubre una
  zona donde sí hay recolección real (los 4 caen en RAMIREZ, EL GUAVIO, LOS
  LACHES — barrios periféricos de la localidad, plausible que el polígono
  oficial no llegue hasta ahí).

Ninguna de las dos se puede descartar sin que alguien con conocimiento de
campo revise los 4 puntos en el mapa. Queda como pendiente de investigación,
no de corrección automática.

## Cuándo se permite divergir del hub (regla, 2026-07-30)

- **Datos y cifras: nunca.** Si un número se calcula distinto, los dos
  sistemas dejan de ser comparables y nadie confía en el nuevo. La paridad
  manda, sin excepción.
- **Comportamiento de interfaz: se permite mejorar un defecto que el hub
  también tiene**, si queda documentado como divergencia deliberada con su
  motivo. Este módulo se entrega a otras entidades — replicar un defecto
  conocido solo porque el original lo tiene no le sirve a nadie.
- **Toda divergencia se registra con su motivo**, para que nadie la
  "corrija" después creyendo que es un error.

## Divergencias deliberadas

### Comparación mecánica GESTOR_AMBIENTAL vs hub (2026-07-29, diff archivo por archivo)
Config global (`tailwind.config.js`, `index.css`) y la mayoría de componentes
de `gestor-ambiental/` son **idénticos o casi idénticos** al hub (diff real
de 0-4 líneas por archivo, solo adaptaciones de modelo de datos ya
documentadas: `operativoSubtipo` eliminado por mono-dominio, `puntoId` en
vez de `activityId`). 2 diferencias de estilo reales encontradas y
corregidas:
- `EditActivity.tsx`: `<main>` tenía `py-8`, el hub usa `py-6` — corregido.
- `ActivityDetailView.tsx` (2 divs, líneas ~455/538): al hub le falta
  replicar acá un conflicto de utilidades Tailwind que el hub SÍ tiene
  (`pt-0` junto a `pt-2` en el mismo `className`) — replicado a propósito
  para garantizar el mismo renderizado exacto, con
  `eslint-disable-next-line tailwindcss/no-contradicting-classname` porque
  este repo SÍ tiene esa regla activa (el hub no). El conflicto en sí queda
  documentado como deuda técnica **del hub**, no de acá (ver
  `gov-espacio-publico/DEUDA-TECNICA.md`, ítem 10, rama
  `docs/tailwind-lint-y-usuarios-duplicados`, sin mergear).

### Ícono de tipo de residuo en tarjetas de lista/detalle
El hub no lo tiene — ni siquiera en su propio `ActivityDetail.tsx`, verificado
al portar la vista de detalle (2026-07-30). Se agregó (`ResiduoTipoIcon`,
mismo color por tipo que ya usan los marcadores del mapa) en
`ResiduoDetailModal.tsx`, `NotasResiduoModal.tsx`, `PublicPuntoPage.tsx` y la
vista de detalle compartida (`PuntoDetailView.tsx`) — mejora deliberada, no
gap a cerrar.

### Pestañas "Asignación de Puntos" / "Indicadores" en el panel ADMIN
El hub tiene 2 `useState(false)` independientes para estas secciones — se
pueden abrir las dos a la vez, y no hay ninguna indicación visual de cuál
está "activa" (confirmado en el código real del hub, 2026-07-30, no es un
recuerdo de sesiones anteriores). Es un defecto de UX real del hub mismo,
no un gap de paridad de este repo. Por la regla de arriba ("comportamiento
de interfaz: se permite mejorar un defecto que el hub también tiene"), se
convirtió a comportamiento de pestañas reales acá: un solo `activeSection`
(`'none' | 'asignacion' | 'indicadores'`), una sección visible a la vez,
botón activo marcado visualmente (`aria-pressed`, fondo de color sólido).
Documentado también como deuda técnica **del hub** (ver
`gov-espacio-publico/DEUDA-TECNICA.md`, mismo patrón que el ítem del
conflicto `pt-0`/`pt-2`).

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

### CORRECCIÓN 2026-07-31 (tarde): "Volver al Panel" NO era un alias — faltaba una pantalla entera
La entrada de esta misma sección escrita horas antes decía que `/validador/dashboard`
era un `<Navigate>` a `ValidadorMapaDashboard.tsx` y que el botón "Volver al
Panel" no tenía a dónde ir. **Era incorrecto.** En el hub, `/validador/dashboard`
renderiza `ValidadorDashboard.tsx` — un componente REAL y distinto de
`ValidadorMapaDashboard.tsx` (confirmado en `App.tsx` del hub: son dos
imports, dos rutas separadas), con Actividades Pendientes/Historial,
paneles de filtros, tabla y paginación propios — no un shell "elegí otro
dominio" como se asumió. Este repo nunca portó esa pantalla; el `<Navigate>`
a `/validador/residuos` era un placeholder que quedó desde una sesión
anterior y nadie lo cuestionó porque "el botón no lleva a nada" parecía
confirmar la hipótesis del alias, cuando en realidad confirmaba que faltaba
la pantalla. **RESUELTO 2026-07-31:** `ValidadorDashboard.tsx` porteado del
hub (contadores Actividades Pendientes/Validaciones Realizadas, tabs Puntos
Pendientes/Historial/Residuos, panel de filtros por tab — Gestor, Tipo,
Barrio, Mes/Desde/Hasta, N° Punto, Limpiar — tabla y paginación), adaptado a
mono-dominio: sin selector de Categoría (siempre ambiental), filtro Tipo
con las 2 opciones reales de este dominio (`GENERICO`→"Gestión Ambiental",
`PUNTO_ACUMULACION`→"Puntos de Residuos"), sin filtro de Turno (mismo
motivo ya documentado para el panel de ADMIN — el dato no existe en este
modelo). Filtrado y paginación 100% client-side: el backend de este repo no
tiene los parámetros server-side que tiene el del hub (gestor/categoría/
turno/paginación) — mismo patrón que el resto de las vistas de este repo.
Ruta `/validador/dashboard` en `App.tsx` actualizada para renderizar el
componente nuevo en vez del `<Navigate>`. Botón "Volver al Panel"
restaurado en `ValidadorMapaDashboard.tsx`, ahora navega a una pantalla
real.

**Lección para el proceso, otra vez:** "el botón no rompe nada, solo no
lleva a ningún lado" no es evidencia de que el destino sea innecesario —
puede ser evidencia de que el destino nunca se construyó. Verificar contra
el código REAL del hub (qué componente renderiza esa ruta) antes de
concluir "es un alias"/"no aplica" — ya van dos veces con este mismo error
de razonamiento (ver también la fila ADMIN, `ESTADO-EXTRACCION.md`,
2026-07-29).

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

## Re-migración limpia (2026-07-31)

Los datos de prueba (10 puntos reasignados a `gestor@test.com` desde otros
gestores, más 2 puntos de verificación #109/#110 creados por pruebas de API)
desalinearon ambiental del hub. Se truncaron `puntos_residuo`,
`punto_asignacion`, `ruta_semanal` y `procesos` en ambiental (autorizado
explícitamente por Josh, credenciales de un solo uso) y se re-corrió
`migrate-from-legacy.ts` completo desde el hub. Verificado: conteos por
tabla y por gestor coinciden exactamente hub↔ambiental (346 puntos, 345
asignaciones, 12 rutas), muestreo de 10 puntos al azar coincide campo por
campo. El punto huérfano `acc78a89-...` (bajo Fredy en el hub) resultó ser
una fila de `punto_asignacion` sin actividad real detrás (0 filas en
`activities` para ese id) — documentado en
`gov-espacio-publico/DEUDA-TECNICA.md` ítem 10, no se migró (el JOIN contra
`activities` ya lo excluye naturalmente). Tras la re-migración se volvieron
a reasignar 10 puntos a `gestor@test.com` **solo en ambiental**, para
pruebas — lista exacta a revertir antes del corte en `DEUDA-TECNICA.md`
ítem 3 de este repo.

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

## PUNTO DE RETOMA (2026-07-30, cierre de sesión)

**Dónde quedamos:** el porte completo de pantallas (fase 1 + fase 2, ver
matriz arriba) está commiteado y pusheado en `test` (repo A) y el canario
está mergeado a `main` y desplegado en `gov-espacio-publico` (repo B) —
funcionando de punta a punta para los 3 roles con las cuentas de prueba
(`gestor@test.com`, `ambiental@validadortest.com`, `admin@test.com`).
Confirmado por grep directo del bundle de producción: los 3 correos están
baked-in en 4 puntos del código (admin, gestor, `ValidadorMapaDashboard`,
`ValidadorDashboard` — el último fue el fix de esta sesión, la ruta real de
aterrizaje de `/validador/dashboard` que faltaba).

**Lo siguiente (cerrado 2026-07-31):** Josh trajo 5 hallazgos concretos del
recorrido visual, en orden de prioridad. Los 5 se resolvieron la misma
noche, sesión autónoma sin supervisión — ver detalle en la sección
siguiente. Commits en `test`, todos pusheados y confirmados en `origin`.

## Hallazgos del recorrido visual 2026-07-30 — resueltos 2026-07-31

Sesión nocturna autónoma (Josh no supervisó en vivo). Los 5 en orden de
prioridad que pidió, commit por bloque, cada uno desplegado y verificado
contra Railway antes de seguir al siguiente.

1. **Módulo `files` bloqueaba TODA creación de puntos** (`Cannot POST
   /api/files/photos`) — RESUELTO. Ver "Pendiente de replicar" ítem 6 arriba
   para el detalle técnico completo.
2. **Formulario de "Puntos de Acumulación" no coincidía en estructura** —
   RESUELTO. El único defecto estructural real: "Identificación del
   presunto generador" estaba como sección propia (`section-box` completo
   con su propio encabezado), debía ser un sub-bloque DENTRO de "2. Datos
   del punto" (mismo `section-box`, solo un divisor interno). El resto
   (secciones 3/4/5, sub-formulario de residuo con sus 9 campos exactos:
   Tipo de Residuo 13 opciones, Quién dispuso 5, Actores indisciplina 6,
   fecha/hora, olores, vectores, área, observaciones, foto) ya coincidía
   byte a byte con el hub — verificado comparando `RESIDUO_TIPOS`/
   `ACTORES_INDISCIPLINA` (conteos exactos) y las clases Tailwind de
   `section-box`/header contra `DynamicFields` del hub.
3. **Subtipo "Ambiental" genérico eliminado por error como código muerto**
   en una sesión anterior (commit `9369cdc`, "elimina survey.service.ts y
   todo lo que quede del formulario dinámico") — CONFIRMADO real y
   RESUELTO. Verificado con la API pública de `gov_encuestas_publico`
   (sin tocar su base de datos): la categoría AMBIENTAL tiene 2
   subcategorías reales, "Ambiental" (genérico) y "Puntos de Acumulación
   de Residuos", ambas con encuesta activa. Las 9 secciones y todos los
   campos/límites (fotos máx. 5/10MB, acta PDF mín. 3 páginas/máx. 10MB,
   20 entidades) coinciden exactos con lo que describió Josh. Modelo de
   datos elegido (aprobado por Josh): extender `PuntoResiduo` con
   discriminador `tipoOperativo` (`PUNTO_ACUMULACION` default | `GENERICO`)
   en vez de una entidad aparte — evita duplicar la máquina de estados y
   los endpoints de asignación/validación, que es donde se producen los
   errores (mismo razonamiento que ya protege `PuntoAsignacion` como tabla
   separada, pero aplicado al revés aquí: dos variantes del MISMO dominio
   comparten TODO el ciclo de vida). De los ~12 campos que Josh listó como
   nuevos, solo 7 son genuinamente nuevos (contadores numéricos); el resto
   ya existían como columnas compartidas y se REUTILIZAN en vez de
   duplicarse: `photos` (evidencia fotográfica), `results` (descripción
   general), `actaPdfUrl`, `entidadResponsable`, `isGroupOperativo`
   (operativo en grupo), `gestoresInvolucradosIds` (gestores
   acompañantes). Migración `1785460184016-TipoOperativoGenerico` corrida
   contra producción (`Postgres-_hTA`) — confirmada en logs de Railway:
   `CREATE TYPE`, `ALTER TABLE` × 8, `COMMIT`, "executed successfully".
4. **Ruta nunca marcaba puntos visitados (0/7 fijo)** — causa raíz real:
   `PuntosService.agregarNota()` (agregar una nota a un residuo) no
   estampaba `ultimoSeguimientoAt`, a diferencia del hub
   (`sorver.repository.typeorm.ts:1288`, con test dedicado) — confirmado
   que es un gap real, no una divergencia. `MARCAR_RECOGIDO`/
   `AGREGAR_RESIDUO` sí lo estampaban ya. Corregido con 3 tests nuevos
   cubriendo las 3 acciones. **Algoritmo de ruta comparado archivo por
   archivo contra el hub — 100% idéntico** (`geo.ts`, `rutaModos.ts`,
   `ruta.ts`, diff vacío salvo el nombre de campo esperado
   `activityId`→`puntoId`). No hacía falta ningún cambio ahí.
5. **"Volver al Panel" del validador rebotaba a sí mismo** — causa raíz:
   el botón (código idéntico al hub, `navigate('/validador/dashboard')`)
   navega a una ruta que en `App.tsx` de ESTE repo es un `<Navigate
   to="/validador/residuos" replace />` — un alias a la MISMA pantalla
   donde vive el botón (porque acá no hay, como en el hub, un shell
   multi-dominio distinto al que volver). El click no rompía nada, solo
   redirigía de vuelta al mismo lugar — se sentía como un refresh sin
   efecto. **Decisión tomada (no consultada, sesión autónoma): se quitó el
   botón** en vez de apuntarlo a otro lado — no hay ningún "panel" distinto
   dentro de este repo mono-dominio al que volver desde acá. La ruta
   `/validador/dashboard` en sí NO se tocó — sigue siendo el destino real
   del canario desde `bogotaneidapp.com` tras login. Auditoría completa de
   rutas (frontend: todo `navigate()`/`window.open`/`href` interno;
   backend: toda llamada de servicio contra los controllers) — 0 rotas
   fuera de esta ya conocida.

**Incidente de infraestructura durante el hallazgo 3** (ver
`PLAN-MAESTRO.md`, sección HITO 2, para el detalle completo): la migración
automática al desplegar (`startCommand`/`CMD` corriendo la migración antes
de `node dist/main`) se intentó y se revirtió — rompía el healthcheck sin
causa clara identificada, incluso con diagnóstico explícito de código de
salida. La migración pendiente ya había corrido y quedado comprometida en
producción antes de que el contenedor de ese intento muriera, así que no
bloqueó el resto de la noche, pero las migraciones futuras vuelven a
correrse a mano hasta investigarlo con más tiempo.

**Pendiente de verificación visual (necesita browser, no se pudo esta
sesión):** subir una foto real desde el formulario, guardar el punto,
reabrirlo y confirmar que la imagen se ve. El endpoint está desplegado y
protegido (`401` sin token, no `404`) y la lógica está cubierta por 10
tests unitarios, pero el recorrido real en navegador con una cuenta de
prueba lo tiene que hacer Josh.

## Pendientes de infraestructura (2026-07-31)

- **`git push` se colgaba indefinidamente** (Git Credential Manager, sin
  prompt visible ni siquiera con `GIT_TERMINAL_PROMPT=0`) — bloqueó el
  trabajo varias veces esta noche hasta que Josh desactivó el credential
  helper local (`git config --local credential.helper ""`) en ambos repos
  (`gov_ambiental` y `gov-espacio-publico`) y puso un GitHub PAT embebido en
  la URL del remoto (`origin`) como solución temporal para esta sesión.
  **Dos secretos quedaron expuestos en el chat de esta sesión y deben
  rotarse**: un token de Railway y el PAT de GitHub — Josh dijo que los
  revoca al día siguiente. La URL del remoto con el token embebido queda
  como está a propósito (instrucción explícita de Josh, no tocar) hasta que
  él la revoque/cambie.
- **Railway MCP sin acceso** (persiste desde la sesión anterior, no se
  resolvió): la sesión cacheada del cliente sigue devolviendo
  "Unauthorized" pese a que la CLI (`railway whoami`) sí está autenticada
  — toda la verificación de despliegue de esta noche se hizo con la CLI
  directamente (`railway status`, `railway logs`, `railway link`,
  `railway run`), no con las tools MCP. Sigue pendiente reiniciar la
  sesión del cliente para que el MCP recoja el token.
- **Railway MCP sin acceso**: `railway login` se corrió 3 veces en esta
  sesión (cuenta `Joshua Rivera`), la CLI quedó autenticada pero el
  servidor MCP sigue devolviendo "Unauthorized" — es una sesión cacheada
  del lado del cliente que un re-login no refresca. Hace falta reiniciar
  la app/sesión del cliente de código (no solo la CLI) para que el MCP
  recoja el token nuevo. Además, el proyecto Railway de
  `gov-espacio-publico` pertenece a la cuenta `julianrivera75`, no a
  `Joshua Rivera` — si el MCP debe operar sobre ese proyecto, hace falta
  confirmar con qué cuenta autenticarse antes de repetir el login.
- **Cuentas de prueba con contraseña conocida**: `gestor@test.com`,
  `ambiental@validadortest.com`, `admin@test.com` (contraseñas
  restablecidas manualmente esta sesión, ver sección de cuentas de prueba
  más abajo) tienen acceso real de producción hoy — son las mismas 3
  cuentas de la lista blanca del canario. Rotar o desactivar antes de
  cualquier paso hacia producción definitiva (HITO 3/4); mientras el
  canario siga activo con estas cuentas, dejarlas como están es
  aceptable, pero no debe olvidarse antes del corte.
- **Disciplina de rama rota en el hub**: el último cambio de esta sesión
  (agregar el botón de canario a `ValidadorDashboard.tsx`) se hizo directo
  sobre `main` de `gov-espacio-publico`, sin pasar por una rama — porque
  `feature/ambiental-handoff-sidebar` ya se había mergeado momentos antes
  y el fix era la continuación lógica del mismo trabajo. Fue una excepción
  puntual, no la norma: retomar rama por cambio para lo que siga en el
  hub, incluida cualquier corrección que salga del recorrido visual de
  Josh.
