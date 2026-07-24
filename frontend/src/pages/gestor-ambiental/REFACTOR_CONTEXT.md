# Gestión Ambiental — Refactor móvil + modularización (contexto / handoff)

> Estado al 2026-06-05. Repo: `gov-espacio-publico`. Branch: `main` (deploy en Railway).
> Documento de trabajo para retomar en sesión nueva sin perder contexto.

## Objetivo general

Dos frentes sobre el rol **Gestor Ambiental** (`GESTOR_AMBIENTAL`):

1. **UX móvil** — los gestores usan la app en el celular; varias cosas no se veían/usaban bien.
2. **Modularización / portabilidad** — `GestorAmbientalDashboard.tsx` era un monolito de 2.561 líneas. Partirlo en módulos (lib/hooks/components) para mantenerlo, escalarlo y eventualmente extraerlo como módulo aparte del sistema (como `gov_encuestas_publico`). También aplica a `RevisarActividadPage.tsx`.

Regla #1 del usuario: **no romper el flujo ni la consistencia de datos.** Commits de una línea, sin menciones de IA.

## Rutas del rol (App.tsx)

- `/gestor-ambiental/dashboard` → `GestorAmbientalDashboard.tsx` (vista principal, mapa Leaflet + 3 vistas por `viewMode`).
- `/gestor-ambiental/crear-actividad` → `gestor/CreateActivity.tsx` (compartido).
- `/gestor-ambiental/editar-actividad/:id` → `gestor/EditActivity.tsx`.
- `/gestor-ambiental/revisar-actividad/:id` → `RevisarActividadPage.tsx` (330 líneas, pendiente modularizar).
- `/gestor-ambiental/actividad/:id`, `/completar-fase2/:id`.

`viewMode` = `'general-map' | 'activity-detail' | 'historial'` (historial parece no estar activamente montado por condición).

## Estructura modular creada (carpeta `gestor-ambiental/`)

```
lib/
  constants.ts   PUNTO_CRITICO_COLOR, AMBIENTAL_COLOR, months, tipoResiduoLabels, type ViewMode, type SidebarTab
  dates.ts       getTodayDate, getLastWeekDate, getStartOfMonthDate, getEndOfMonthDate, getDatesForMonth
  kml.ts         parseDescription (tabla HTML de descripcion de sector KMZ)
  geo.ts         isInside (ray casting punto-en-poligono, soporta holes / MultiPolygon / GeometryCollection)
  residuos.ts    getResiduos, isPuntoEmergencia, isPuntoRecogido
  icons.ts       createPuntoCriticoIcon, createAmbientalIcon, ambientalIcon (Leaflet DivIcon)
hooks/
  usePersistentState.ts
  useGestorAmbiental.ts  TODO el estado/effects/memos/handlers; exporta `GestorAmbientalValue = ReturnType<...>`
context/
  GestorAmbientalContext.tsx  Provider + useGestorAmbientalCtx() tipado estricto (valor = ReturnType del hook)
components/
  MapHelpers.tsx        InvalidateMap, MapFocus (flyTo a un punto con nonce)
  ResiduoImages.tsx     ResiduoImage, ResiduoDetailImage, PreviewImage (usan useFileUrl)
  SeguimientoModal.tsx  (extraido - modal marcar recogido / agregar residuo)
  ResiduoDetailModal.tsx (extraido - detalle de un residuo)
  ActivityDetailView.tsx (extraido - viewMode 'activity-detail', por props)
  AmbientalHeader.tsx   (extraido - header, por props)
  ActivitySidebar.tsx   (extraido - lista de actividades, por props)
  GeneralMapView.tsx    (extraido - viewMode 'general-map', consume GestorAmbientalContext)
GestorAmbientalDashboard.tsx  (orquestador liviano, ~185 lineas; era 2561)
REFACTOR_CONTEXT.md  (este doc)
```

`isPuntoRecogido`/`isPuntoEmergencia` ya NO se exportan desde el dashboard; viven en `lib/residuos.ts`. Nadie mas los importaba del dashboard (admin tiene su propia copia en `admin/utils/adminHelpers.ts`).

## HECHO (commits en `main`, todos con build verde)

Orden cronologico (hash -> que):

- `78c41e60` — **Fundacion modular**: extraidos helpers/iconos/hooks/subcomponentes a `lib/`, `hooks/`, `components/`. Sin cambio de comportamiento.
- `b1b23bb4` — **Click en punto centra el mapa** (componente `MapFocus`/flyTo) y deja de abrir el panel de sector y la lista de sectores (se quito la cascada `handleSectorsForActivity` del click y de `openActivity`).
- `6ac6986a` — Boton flotante verde unico "Actividades (N)"; se elimino un FAB superpuesto (habia dos: uno verde `z-1000` y otro `bg-neutral-900` `z-2000` encimados).
- `7ed53eeb` — **Filtros = drawer deslizable full-screen en movil** (desktop conserva panel flotante). **Sectores: lista muestra solo los señalados + boton "Ver mas" (`showAllSectors`)** para ver todos.
- `7f90321d` — **Legibilidad**: fuentes minimas `text-[8px]/[9px]/[10px]` -> `text-[11px]` uniforme (replace_all). **Header movil mas compacto** (gaps `gap-1.5 sm:gap-2 md:gap-3`, boton Emergencia icon-only en `<sm`).
- `5979e68a` — **Extraido `SeguimientoModal`** a componente con densidad movil (overlay `p-3 sm:p-5`, header/body `p-4 sm:p-6`, inputs `text-sm`).
- `2a3a84cc` — **Extraido `ResiduoDetailModal`** a componente con densidad movil. Dashboard quedo en **1822 lineas**.
- `3e037351` — La **insignia "N Actividades"** (arriba-derecha del mapa) ahora ES el boton que abre la lista en movil; se quito el FAB inferior redundante. **Click en punto marca (señala) los sectores del punto** en `activeSectorIds` (para que aparezcan seleccionados al abrir el menu de sectores) sin abrir el panel.
- `a3e170f9` — **Leyenda compacta en movil + sin solapar el control de capas.** `MapLayerControl` ahora avisa abierto/cerrado (`onOpenChange`) y su panel usa ancho responsivo `w-[min(85vw,360px)]`. El dashboard oculta la leyenda en movil mientras el panel de capas esta abierto (`layersPanelOpen`) y reduce padding/gaps/puntos de la leyenda en movil (fuente sigue en 11px).
- `9dee5436` — **Extraido `ActivityDetailView`** (`viewMode === 'activity-detail'`) a `components/ActivityDetailView.tsx`. El estado de filtro de fechas (`gad_recDesde`/`gad_recHasta`) se movio dentro del componente (mismas keys de localStorage). El dashboard pasa `displayIdx` calculado y callbacks (`onBack`, `onOpenSeguimiento`, `onResiduoDetail`, `onEdit`). Dashboard quedo en **1448 lineas**.
- `734cdbc4` — **Extraido `AmbientalHeader`** a `components/AmbientalHeader.tsx`. Props: `userName`, `userLastname`, `emergencyFilter`, `onToggleEmergency`, `onLogout`.
- `453fbf43` — **Extraido `ActivitySidebar`** a `components/ActivitySidebar.tsx`. Props: `showSidebarMobile`, `onCloseMobile`, `sidebarTab`, `onTabChange`, `puntoCriticoCount`, `ambientalCount`, `rechazadasCount`, `viewMode`, `onShowMap`, `sidebarActivitiesWithIndex`, `selectedActivityId`, `onSelectActivity`. Dashboard quedo en **1293 lineas**.
- `bcb561b8` — **Extraido `GeneralMapView`** (`viewMode === 'general-map'`) a `components/GeneralMapView.tsx`. Se monto `hooks/useGestorAmbiental.ts` con TODO el estado/effects/memos/handlers (≈40 useState, memos, `loadActivities`/`openActivity`/`handleLogout`/`handleAutoMarkOrdinarios`, carga KMZ) y `context/GestorAmbientalContext.tsx` (Provider + `useGestorAmbientalCtx()`, valor tipado con `ReturnType` del hook → tsc detecta cableado faltante). `GeneralMapView` consume el contexto (sin prop-drilling). El resto (header/sidebar/detalle/modales) sigue por props desde el hook. Dashboard quedo en **~185 lineas** (era 2561). Build verde, tsc = 46.

### Cambios UX puntuales pedidos por el usuario (estado)
- [x] Click en punto -> centra mapa, sin abrir sector ni lista de sectores.
- [x] Click en punto -> marca sus sectores en el menu (aparecen señalados).
- [x] Boton "Actividades (N)" verde, intuitivo; la insignia del contador es el boton; sin FAB duplicado.
- [x] Filtros como sidebar deslizable full-screen en movil.
- [x] Lista de sectores: solo los señalados + "Ver mas".
- [x] Tipografia minima subida a 11px.
- [x] Header movil compacto.
- [x] Densidad de `SeguimientoModal` y `ResiduoDetailModal`.

## PENDIENTE

### Stage 2 — partir las vistas grandes en componentes — **COMPLETO**
Dashboard en **~185 lineas** (era 2561). Todas las vistas grandes ya estan extraidas:

1. ~~**`ActivityDetailView`**~~ **HECHO** (`9dee5436`). Props: `activity`, `displayIdx`, `layerVisibility`, `setLayerVisibility`, `onBack`, `onOpenSeguimiento`, `onResiduoDetail`, `onEdit(id)`. Filtro de fechas vive dentro del componente.
2. ~~**`GeneralMapView`**~~ **HECHO** (`bcb561b8`). `viewMode === 'general-map'`. El mas acoplado: mapa + Map Tools (filtros, boton sectores, insignia Actividades, actividades-en-calor), drawer de filtros, panel de sectores, markers, leyenda. Se resolvio con **hook + contexto** (ver abajo) en vez de ~50 props.
3. ~~**`ActivitySidebar`**~~ **HECHO** (`453fbf43`).
4. ~~**`AmbientalHeader`**~~ **HECHO** (`734cdbc4`).
5. **`HistorialView`** si se reactiva (no montado actualmente por condicion).

**Patron usado (hecho en `bcb561b8`):** `hooks/useGestorAmbiental.ts` tiene TODO el estado/effects/memos/handlers (≈40 `useState`, memos `filteredActivities`, `filteredActivitiesWithIndex`, `mapActivitiesFinal`, `sidebarActivitiesWithIndex`, `activitySectorMap`, `actividadesEnCalor`, `barriosUnicos`; handlers `loadActivities`, `openActivity`, `handleLogout`, `handleAutoMarkOrdinarios`, carga KMZ de sectores) y devuelve un objeto unico. `context/GestorAmbientalContext.tsx` expone Provider + `useGestorAmbientalCtx()`; el valor se tipa con `GestorAmbientalValue = ReturnType<typeof useGestorAmbiental>` (tipado estricto sin escribir interfaz a mano; tsc detecta cableado faltante). El dashboard llama el hook una vez, envuelve en `<GestorAmbientalProvider value={gad}>`, pasa props a header/sidebar/detalle/modales y renderiza `<GeneralMapView />` que consume el contexto. **Truco clave:** `GeneralMapView` destructura del contexto con los mismos nombres que tenian las variables locales → el JSX se copio verbatim sin renombrar. `ActivityDetailView`/`ActivitySidebar`/`AmbientalHeader` siguen por props (funcionan, se pueden recablear al contexto luego si se quiere). Patron equivalente al de `admin/hooks/useAdminDashboard.ts` + tabs.

### RevisarActividadPage.tsx — **HECHO** (`fc85c3dd`)
Modularizado: extraidas `components/RevisarContextoCard.tsx` (contexto + fotos "antes", props `activity`) y `components/RevisarResiduosCard.tsx` (residuos identificados, normaliza `operativoData.residuos[]` nuevo y legacy, props `activity`). La page conserva form/handlers (`descripcionDespues`, `photosFase2`, `handleSubmit` -> `processService.reviewActivity`) y renderiza las dos cards. Bajo de 330 a ~150 lineas. Build verde, tsc = 46.

### Densidad restante (menor)
- Vista de detalle: grids `grid-cols-2 md:grid-cols-4` son aceptables en movil; revisar si el usuario quiere 1 columna.
- Leyenda (abajo-izq) vs control de capas (abajo-der, Leaflet) — verificar que no se encimen en pantallas chicas.

## Notas tecnicas para la proxima sesion

- **Build:** `pnpm --filter frontend build` (esbuild, NO typecheck). Desde `gov-espacio-publico/`.
- **Typecheck (red de seguridad):** `cd packages/frontend && npx tsc --noEmit | grep -c "error TS"`. **Baseline = 46 errores preexistentes** (el proyecto no es tsc-limpio; build usa esbuild). Metodo: tras cada cambio, el conteo debe seguir en **46** (sin net-new). Errores preexistentes tipicos: `r.status`/`activity.status === 'Recogido'` no en tipos, `pointNumber` possibly undefined, etc.
- **Los numeros de linea se corren** con cada edicion grande. Re-`grep` por nombre antes de editar; no confiar en lineas viejas.
- **Editar bloques grandes:** el `Edit` exige match exacto. Para reemplazar una vista completa, transcribir el bloque verbatim del `Read` (funciono para SeguimientoModal/ResiduoDetailModal). Si falla el match, re-leer y reintentar.
- **GateGuard (plugin `ecc` recien instalado):** hook `gateguard-fact-force` que **bloquea Edit/Write/Bash** hasta presentar hechos (importadores, simbolos afectados, I/O de datos, instruccion verbatim). Hay que anteponer esos hechos en cada operacion. Para desactivar: correr la sesion con `ECC_GATEGUARD=off` o `ECC_DISABLED_HOOKS=pre:edit-write:gateguard-fact-force,pre:bash:gateguard-fact-force`.
- **Hook de costo:** el plugin `ecc` tambien avisa costo de sesion; la sesion anterior llego a ~$886 -> por eso se corto. Conviene retomar en sesion nueva (contexto limpio = mas barato).
- **Estado compartido clave** (no romper): `activeSectorIds` (Set), `activitySectorMap` (Map actividad->sectorIds), `selectedSector`/`showSectorPanel`/`showAllSectors`, `focusPoint`/`focusNonce` (centrar mapa), `layerVisibility`. La carga de sectores KMZ corre al montar (`/boundaries/RecoleccionUrbana.kmz` con JSZip+toGeoJSON).
- **Datos de residuos:** `operativoData.residuos[]` (JSONB). `getResiduos()` normaliza formatos viejos/nuevos/por-UUID. No tipar estatico.

## Como retomar (sesion nueva)

1. Leer este archivo: `packages/frontend/src/pages/gestor-ambiental/REFACTOR_CONTEXT.md`.
2. Confirmar `main` en `bcb561b8` o posterior, build verde, `tsc` = 46.
3. **Refactor COMPLETO.** Dashboard (~185 lineas) y RevisarActividadPage (~150 lineas) ya modularizados. No queda pendiente grande. Opcional: recablear ActivityDetailView/ActivitySidebar/AmbientalHeader al contexto (hoy por props, funcionan). `HistorialView` solo si se reactiva.
4. Build + tsc-diff + commit (una linea) tras cada extraccion.
