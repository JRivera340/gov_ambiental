# Extracción del módulo ambiental — estado
Última actualización: 2026-07-28 (sesión nocturna autónoma: paridad de edición de puntos, recalculo de proceso verificado, analisis de files/survey)

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

| Vista | Rol(es) | Ruta hub | Ruta aquí | Estado | Qué falta |
|---|---|---|---|---|---|
| Mapa general gestor | GESTOR_AMBIENTAL | `/gestor-ambiental/dashboard` | igual | REPLICADA | — |
| Planificador ruta / ruta activa / segmento / historial | GESTOR_AMBIENTAL | viewModes del dashboard | igual (viewMode extra `historial`) | REPLICADA | — |
| Crear punto | GESTOR_AMBIENTAL | `CreateActivity` genérico multi-categoría | `CreateActivity` dedicado solo AMBIENTAL | DIVERGENTE deliberada | ninguna — simplificación válida, ver sección Divergencias |
| Editar punto | GESTOR_AMBIENTAL, VALIDADOR_AMBIENTAL, ADMIN | permite editar a validador/admin | `PATCH /puntos/:id` permite los 3 roles; GESTOR_AMBIENTAL sigue restringido a lo suyo, VALIDADOR_AMBIENTAL/ADMIN pueden editar cualquier punto | REPLICADA (2026-07-28, con tests) | — |
| Dashboard validador | VALIDADOR_AMBIENTAL | `/validador/dashboard` (compartido con PYBA) | dedicado, ya portado (commit 83f72bb: tabs/filtros/paginación) | REPLICADA | — |
| Mapa de residuos validador | VALIDADOR_AMBIENTAL | `/validador/residuos` | igual | REPLICADA | — |
| Vista pública de punto | público | `GET /sorver/public/actividad/:id` | `GET /puntos/public/:id` | REPLICADA | — |
| Admin — asignación de puntos + indicadores | ADMIN | montado en `/admin/dashboard` (tab `EnvironmentalTab`, uno de varios tabs multi-dominio) | `AdminDashboard.tsx` propio (un solo tab, mono-dominio) + ruta `/admin`, montado 2026-07-27 | REPLICADA | — (interfaz de `EnvironmentalTab` simplificada de 17 a 12 props; ver Divergencias deliberadas) |

## Pendiente de replicar

Prioridad alta:
1. ~~AdminDashboard shell + ruta `/admin`~~ RESUELTO 2026-07-27: `pages/admin/AdminDashboard.tsx` + `pages/admin/hooks/useAdminDashboard.ts` (hook propio, reducido — no el de 1400 líneas multi-dominio del hub) + ruta `/admin` en `App.tsx`, redirect de `LoginPage` para rol ADMIN. Verificado con backend real levantado (login, `GET /puntos` con token ADMIN) y `tsc`/`vitest` limpios.
2. **CRUD de usuarios en backend** — solo existe `GET /users/gestores/list`. Frontend (`users.service.ts`) ya invoca `create/update/delete/import` sin backend. Necesario para que ADMIN gestione gestores/validadores desde este repo. Origen: módulo de usuarios del hub (verificar ubicación exacta, es compartido entre dominios).
3. **Permitir edición de punto a VALIDADOR_AMBIENTAL/ADMIN** — hoy solo GESTOR_AMBIENTAL puede (`PATCH /puntos/:id`). Decidido: replicar el hub, la paridad manda (ver Decisiones abiertas).

Prioridad media:
4. ~~Recalculo automático de estado de `Proceso`~~ RESUELTO — ya estaba implementado en `puntos.service.ts:154` (equivalente a `sorver.controller.ts:486-488` del hub), esta fila del documento estaba desactualizada. Verificado 2026-07-28 con 2 tests nuevos (`puntos.service.spec.ts`) que confirman que `approve()` llama a `recalculateStatus` cuando el punto tiene `processId`, y que NO lo llama cuando no lo tiene.
5. ~~Corregir `process.service.ts` (frontend) — llama `/sorver/processes*`, backend real es `/procesos`.~~ RESUELTO 2026-07-27: `process.service.ts` y `SectorRecoleccionPanel.tsx` apuntaban al prefijo `/sorver/` del hub (2 archivos, 8 llamadas). Repuntados a `/procesos*` y `/api/sectores/*`, verificado contra los controllers reales y probado en caliente contra backend levantado (rutas responden 401 con guard, no 404).

Prioridad baja / depende de decisión abierta:
6. Módulo `files` (subida de acta/fotos a R2) — ver Decisiones abiertas: no implementar hasta fase 2. **Análisis 2026-07-28** (solo investigación, sin implementar):
   - `frontend/src/services/files.service.ts` espera 3 endpoints que no existen en este backend: `POST /files/acta` (sube 1 PDF, devuelve `{success, key, url, message}`), `POST /files/photos` (sube N imágenes, devuelve `{success, keys, urls, count, message}`), `GET /files/:key` (URL firmada/pública de un archivo ya subido).
   - Consumidores reales: `components/ActaUpload.tsx` y `components/PhotosUpload.tsx`, usados desde `CreateActivity.tsx`, `EditActivity.tsx` y (solo `PhotosUpload`) `gestor-ambiental/components/SeguimientoModal.tsx` — es decir, TODO el flujo de creación/edición de puntos y de seguimiento de residuos depende de esto. Hoy, al no existir el backend, cualquier intento de subir un archivo real falla (probablemente 404, no se probó en runtime porque no hace falta ejecutar código para confirmar que el controller no existe).
   - Para implementarlo hace falta: un módulo NestJS `files/` con `FileInterceptor`/`FilesInterceptor` (mismo patrón que `hub/src/files/files.controller.ts`), credenciales de Cloudflare R2 **propias de ambiental** (no reusar el bucket/credenciales del hub — son servicios independientes), y las variables `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET_NAME`. Los roles que deberían poder subir son los mismos que ya usan `PATCH /puntos/:id/seguimiento`: `GESTOR_AMBIENTAL`, `VALIDADOR_AMBIENTAL`, `ADMIN`.
   - `frontend/src/services/survey.service.ts` — **no es un gap, no hace falta implementar nada acá.** Llama directo al microservicio externo `gov_encuestas_publico` (`VITE_SURVEYS_API_URL`, fallback hardcodeado a `backendencuestas-production-d973.up.railway.app`), nunca al backend de este repo. Consumidor único: `pages/CreateActivity.tsx:383` (`surveyService.getSurvey(...)` para traer el formulario dinámico de la encuesta del punto). Es el contrato cross-repo esperado por diseño del workspace (ver `CLAUDE.md` del workspace: "gov-espacio-publico CONSUME gov_encuestas_publico vía HTTP") — este repo hace lo mismo directo desde el frontend, sin pasar por su propio backend.
7. `bulk-delete` de puntos — ver Decisiones abiertas: no replicar hasta confirmar uso real.
8. ~~Assets KMZ de capas institucionales faltantes~~ RESUELTO 2026-07-27: ninguno de los archivos que `boundaryValidation.ts`, `BoundaryLayer.tsx`, `BarriosLayer.tsx`, `RecoleccionSectorLayer.tsx`/`useSectoresAmbiental.ts`, `GeneralMapView.tsx`, `ActivityDetailView.tsx` y `EnvironmentalTab.tsx` referencian existía en `frontend/public/` de este repo — carpetas `boundaries/` e `icons/` no existían. El código es idéntico al hub (diff vacío en `boundaryValidation.ts`); el problema era 100% de assets estáticos faltantes, con un único root-cause afectando MÚLTIPLES consumidores a la vez: la validación de "¿el punto cae dentro de Santa Fe/el barrio?" en `CreateActivity`/`EditActivity` fallaba en silencio (catch), y los mapas de gestor/validador/admin no mostraban ningún polígono de referencia. Copiados desde el hub (solo lectura ahí): 12 archivos KMZ/KML en `boundaries/` (`KMZ_Sectores_Catastrales_SF_2026.kmz`, `doc.kml`, `Carrera7.kmz`, `Capa_Colegios.kmz`, `Cestas (1).kmz`, `Vias_FalloSV_LaCapuchina.kmz`, `Vias_FalloSV_SantaInes.kmz`, `PropiedadHorizontal (1).kmz`, `UPZ_SantaFe.kmz`, `Capa_Cambuches.kmz`, `Capa_Bodegas.kmz`, `RecoleccionUrbana.kmz`) y `Residuos.png` en `icons/` (usado por `createPuntoCriticoIcon` en `gestor-ambiental/lib/icons.ts`, roto por la misma razón — mismo bug que ya se había corregido en `adminHelpers.ts` reemplazando por SVG inline, pero ahí no se tocó código, solo se trajo el asset real). Verificado sirviendo con el frontend levantado (`200` en los 5 archivos probados). Ninguno de estos 8+1 layers institucionales es exclusivo de ambiental (confirmado en el hub, son transversales) — se trajeron tal cual porque son datos de referencia geográfica, no código de dominio.

## Divergencias deliberadas

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

## Decisiones abiertas

| Decisión | Default mientras no se resuelva | Quién decide |
|---|---|---|
| Módulo files / almacenamiento R2 | No implementar nada nuevo. Documentar cómo se suben adjuntos hoy y dejarlo igual hasta la fase 2. | Josh |
| ¿bulk-delete se usa realmente? | No replicar hasta confirmar que alguien lo usa en producción. Si nadie lo usa, queda fuera de alcance. | Josh |
