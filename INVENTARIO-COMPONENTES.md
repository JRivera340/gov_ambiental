# Inventario de componentes — frontend
Última actualización: 2026-07-28

Generado con `rg`/`grep` sobre `frontend/src`. Conteo de imports = archivos que
hacen `import { X } from '...'` con ese nombre exacto, excluyendo el propio
archivo de definición y falsos positivos por substring (ej. `Input` no cuenta
`SurveyFieldInput`).

## `components/` (genéricos, compartidos)

| Componente | Ruta | Props principales | cva | Imports |
|---|---|---|---|---|
| `ActaUpload` | `components/ActaUpload.tsx` | `onUploadSuccess`, `existingUrl?`, `activityId?`, `disabled?` | No | 2 |
| `AppIcon` | `components/AppIcon.tsx` | `name: IconName`, `className?` | No | 1 |
| `BarriosLayer` | `components/BarriosLayer.tsx` | `color?`, `fillColor?`, `fillOpacity?`, `weight?`, `visible?` | No | 3 |
| `BoundaryLayer` | `components/BoundaryLayer.tsx` | `kmlPath?`, `color?`, `fillColor?`, `fillOpacity?`, `weight?`, `visible?` | No | 11 |
| `Loading` | `components/Loading.tsx` | sin props (spinner fijo) | No | 4 |
| `MapLayerControl` | `components/MapLayerControl.tsx` | `layerVisibility`, `onLayerVisibilityChange`, `onToggleAll?`, `position?` | No | 5 |
| `PhotosUpload` | `components/PhotosUpload.tsx` | `onUploadSuccess`, `existingUrls?`, `activityId?`, `disabled?`, `maxPhotos?` | No | 3 |
| `RecoleccionSectorLayer` | `components/RecoleccionSectorLayer.tsx` | `visible?`, `onSectorClick?`, `selectedSectorId?`, `activeSectorIds?`, `sectorStats?` | No | 4 |
| `SectorRecoleccionPanel` | `components/SectorRecoleccionPanel.tsx` | `sector`, `onClose`, `onRefresh?`, `desde?`, `hasta?`, `status?`, `tipo?` | No | 1 |
| `StatusBadge` | `components/StatusBadge.tsx` | `status: ActivityStatus`, `size?: 'sm'\|'md'` | No (usa `Badge` variants internamente vía config propio) | 4 |
| `Toast` | `components/Toast.tsx` | `message`, `type?`, `onClose`, `duration?` | No | 5 |
| `ValidadorActividadPanel` | `components/ValidadorActividadPanel.tsx` | `activity`, `onClose`, `onUpdated` | No | 1 |
| `ValidadorResiduoPanel` | `components/ValidadorResiduoPanel.tsx` | `activity`, `onClose`, `onUpdated` | No | 1 |
| `SurveyFieldInput` | `components/create-activity/SurveyFieldInput.tsx` | `question`, `value`, `onChange` | No | 1 |

## `components/shell/` (layout del gestor-ambiental)

| Componente | Ruta | Props principales | cva | Imports |
|---|---|---|---|---|
| `AppShell` | `components/shell/AppShell.tsx` | `title`, `subtitle?`, `navItems`, `activeNavKey`, `onSelectNav`, `secondaryActions`, `children` | No | 1 |
| `BottomNav` | `components/shell/BottomNav.tsx` | `items`, `activeKey`, `onSelect` | No | 1 |
| `BottomSheet` | `components/shell/BottomSheet.tsx` | `state`, `onStateChange`, `title`, `count?`, `children` | No | 1 |
| `EdgeDrawer` | `components/shell/EdgeDrawer.tsx` | `label`, `side?`, `defaultOpen?`, `children` | No | 3 |
| `NavIcon` | `components/shell/NavIcon.tsx` | sin interfaz propia (props inline) | No | 5 |
| `OverflowMenu` | `components/shell/OverflowMenu.tsx` | `actions`, `trigger?: 'icon'\|'inline'`, `collapsed?` | No | 1 |
| `SideNav` | `components/shell/SideNav.tsx` | `items`, `activeKey`, `onSelect`, `collapsed`, `onToggleCollapse`, `footer?` | No | 1 |

## `components/ui/` (primitivas de diseño)

| Componente | Ruta | Props principales | cva | Imports |
|---|---|---|---|---|
| `Badge` | `components/ui/badge.tsx` | `variant`: default/secondary/destructive/outline/success/warning + estados (`borrador`/`enviada`/`aprobada`/`rechazada`/`publicada`) | **Sí** (ya existía, matching hub) | 4 |
| `Button` | `components/ui/button.tsx` | `variant`: default/destructive/outline/secondary/ghost/link/success · `size`: default/sm/lg/icon | **Sí** (nuevo 2026-07-28, copia exacta del hub) | 0 — sin consumidores todavía |
| `Card` (+`CardHeader/Title/Description/Content/Footer`) | `components/ui/card.tsx` | `variant`: default/elevated/flat | **Sí** (nuevo — el hub NO usa cva acá, se agregó por decisión explícita de unificar) | 0 — sin consumidores todavía |
| `Input` | `components/ui/input.tsx` | `variant`: default/error | **Sí** (nuevo, mismo motivo) | 0 — sin consumidores todavía |
| `Select` | `components/ui/select.tsx` | `variant`: default/error | **Sí** (nuevo, mismo motivo) | 0 — sin consumidores todavía |

## `pages/admin/components/shared/`

| Componente | Ruta | Props principales | cva | Imports |
|---|---|---|---|---|
| `ClickableMarker` | `pages/admin/components/shared/ClickableMarker.tsx` | `position`, `icon`, `activity`, `index?`, `onActivityClick` | No | 1 |
| `PieChart` | `pages/admin/components/shared/PieChart.tsx` | `data`, `size?`, `suffix?`, `hideLegend?`, `hideCenterText?` | No | 1 |

## `pages/gestor-ambiental/components/` (vistas internas del dashboard de gestor)

| Componente | Ruta | Imports |
|---|---|---|
| `ActivityDetailView` | `.../ActivityDetailView.tsx` | 1 |
| `ActivitySidebar` | `.../ActivitySidebar.tsx` | 1 |
| `BarrioCoberturaBars` | `.../BarrioCoberturaBars.tsx` | 1 |
| `FiltrosDrawer` | `.../FiltrosDrawer.tsx` | 1 |
| `GeneralMapView` | `.../GeneralMapView.tsx` | 1 |
| `HistorialRutaDetalleView` | `.../HistorialRutaDetalleView.tsx` | 1 |
| `HistorialRutasView` | `.../HistorialRutasView.tsx` | 1 |
| `MapHelpers` | `.../MapHelpers.tsx` | 2 |
| `NotasResiduoModal` | `.../NotasResiduoModal.tsx` | 1 |
| `PerfilGestorView` | `.../PerfilGestorView.tsx` | 1 |
| `PlanificadorRutaView` | `.../PlanificadorRutaView.tsx` | 1 |
| `ResiduoDetailModal` | `.../ResiduoDetailModal.tsx` | 1 |
| `ResiduoImages` | `.../ResiduoImages.tsx` | 3 |
| `RutaActivaView` | `.../RutaActivaView.tsx` | 1 |
| `RutaPolylineLayer` | `.../RutaPolylineLayer.tsx` | 4 |
| `RutaSegmentoView` | `.../RutaSegmentoView.tsx` | 1 |
| `SeguimientoModal` | `.../SeguimientoModal.tsx` | 2 |

Todos con 1 solo import son consumidos exclusivamente por `GestorAmbientalDashboard.tsx` (patrón esperado — son vistas internas de un único orquestador, no genéricos). No son huérfanos pese al conteo bajo.

## Hallazgos

### Duplicados sospechosos
- **`StatusBadge.tsx` vs `Badge` (`ui/badge.tsx`)** — ambos resuelven "chip de estado de un punto". `StatusBadge` tiene su propio `statusConfig` mapeando `ActivityStatus` → label/variant/icono, pero las variantes que usa (`borrador`/`enviada`/`aprobada`/`rechazada`/`publicada`) ya están definidas dentro de `badgeVariants` en `ui/badge.tsx`. `StatusBadge` probablemente debería ser un wrapper delgado sobre `Badge` en vez de reimplementar el manejo de color — no se tocó (fuera de alcance de esta tarea, es refactor no pedido), queda anotado.

### Huérfanos
- **`Button`, `Card`, `Input`, `Select`** (`ui/`) — 0 imports. Son las primitivas recién creadas (tarea B7 de esta sesión) — no hay huérfano real, es que la adopción en el resto del código (reemplazar `<button className="...">` crudo por `<Button>`, etc.) NO se hizo en esta pasada — habría sido un refactor de decenas de archivos no solicitado explícitamente, más allá de "unificar las primitivas". Candidato para una tarea futura dedicada.

### Candidatos a subir a `components/ui/`
- **`Toast.tsx`** (`components/`) — genérico, 5 imports, sin dependencia del dominio ambiental. Candidato natural a `ui/toast.tsx`.
- **`Loading.tsx`** (`components/`) — mismo caso, spinner genérico, 4 imports.
- Nada más califica: el resto de `components/` tiene lógica específica del dominio (mapas, KMZ, subida de archivos atados a `activityId`) y no es una primitiva de diseño pura.
