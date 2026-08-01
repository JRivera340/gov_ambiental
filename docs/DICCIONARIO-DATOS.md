# Diccionario de datos

Cada tabla y cada columna de la base de datos, con su tipo, si acepta nulos,
su significado, y los valores posibles cuando es un enumerado. Ver
`MODELO-DATOS.md` para el diagrama de relaciones.

**Campos con datos personales**: marcados explícitamente con ⚠️ donde
aparecen. Son datos de terceros (presuntos generadores de residuos, actores
de la comunidad) capturados por el gestor en campo, no del usuario del
sistema.

---

## `users`

Usuarios del sistema (login propio).

| Columna | Tipo | Nulo | Significado |
|---|---|---|---|
| `id` | uuid | No (PK) | Identificador único |
| `name` | varchar | No | Nombre |
| `lastname` | varchar | No | Apellido |
| `email` | varchar | No (único) | Correo — usado para iniciar sesión |
| `passwordHash` | varchar | No | Contraseña hasheada con bcrypt. Nunca se expone en ninguna respuesta de la API |
| `role` | varchar | No | `ADMIN`, `GESTOR_AMBIENTAL` o `VALIDADOR_AMBIENTAL` |
| `active` | boolean | No (default `true`) | Si es `false`, el usuario no puede iniciar sesión pero sus datos históricos se conservan |
| `createdAt` | timestamptz | No | Fecha de creación |
| `updatedAt` | timestamptz | No | Fecha de última modificación |

---

## `puntos_residuo`

Entidad central: un punto de acumulación de residuos reportado.

### Núcleo del ciclo de vida

| Columna | Tipo | Nulo | Significado |
|---|---|---|---|
| `id` | uuid | No (PK) | Identificador único |
| `createdByUserId` | uuid | No | Quién reportó el punto (referencia a `users.id`) |
| `status` | enum | No (default `BORRADOR`) | `BORRADOR`, `ENVIADA`, `APROBADA`, `RECHAZADA`, `PUBLICADA` — ver nota abajo |
| `tipoOperativo` | enum | No (default `PUNTO_ACUMULACION`) | `PUNTO_ACUMULACION` (con residuos detallados) o `GENERICO` (con contadores agregados) |
| `dateTime` | timestamptz | No | Fecha/hora del reporte |
| `lat` / `lng` | double precision | No | Coordenadas geográficas del punto |
| `barrio` | varchar | No | Barrio de la localidad Santa Fe donde está el punto |
| `photos` | text[] | No (default `{}`) | Claves de las fotos generales del punto (no las de cada residuo) |
| `photosFase2` | text[] | Sí | Fotos de una segunda fase de intervención, si aplica |
| `fechaFinalizacion` | timestamptz | Sí | Cuándo se dio por finalizado el punto |
| `actaPdfUrl` | text | Sí | Clave del acta en PDF, si se subió una |
| `results` | text | Sí | Descripción general / resultado del operativo |
| `entidadResponsable` | text | Sí | Entidad responsable del operativo (UAESP, Policía, etc.) |
| `entidadesAcompanantes` | text[] | Sí | Otras entidades que participaron |
| `isGroupOperativo` | boolean | No (default `false`) | Si fue un operativo en grupo (varios gestores) |
| `gestoresInvolucradosIds` | uuid[] | Sí | Gestores acompañantes, además de quien lo creó |
| `validatorUserId` | uuid | Sí | Quién validó (aprobó o rechazó) el punto |
| `validatedAt` | timestamptz | Sí | Cuándo se validó |
| `validationNotes` | text | Sí | Observaciones del validador (obligatorias al rechazar) |
| `publishedAt` | timestamptz | Sí | Cuándo se publicó (al aprobar) |
| `processId` | uuid | Sí | Proceso al que pertenece, si se agrupó en uno (referencia a `procesos.id`) |
| `pointNumber` | int | Sí | Número correlativo visible del punto, asignado solo a puntos `PUNTO_ACUMULACION` (el menor entero libre, no siempre secuencial) |
| `residuos` | jsonb | No (default `[]`) | Arreglo de residuos identificados — ver estructura abajo |
| `ultimoSeguimientoAt` | timestamptz | Sí | Última vez que se hizo seguimiento a algún residuo del punto |
| `createdAt` / `updatedAt` | timestamptz | No | Auditoría estándar |

**Nota sobre `status`**: el enum incluye `APROBADA`, pero el flujo real de
la aplicación pasa directo de `ENVIADA` a `PUBLICADA` al aprobar — `APROBADA`
queda disponible para casos que se carguen directamente en ese estado (por
ejemplo, en el seed de datos de prueba) pero el endpoint de aprobación no lo
produce. Ver `LIMITACIONES-CONOCIDAS.md`.

### Formulario fijo — 26 campos adicionales (solo aplican a `tipoOperativo = PUNTO_ACUMULACION`)

| Columna | Tipo | Nulo | Significado / valores posibles |
|---|---|---|---|
| `frecuenciaAcumulacion` | enum | Sí | `PRIMERA_VEZ`, `OCASIONAL`, `FRECUENTE`, `PERMANENTE` |
| `observaciones` | text | Sí | Observaciones libres sobre el punto |
| `entornoEscolar` | boolean | Sí | Si está cerca de un colegio/universidad |
| `nombreEntornoEscolar` | varchar | Sí | Nombre de la institución, si aplica |
| `especificarEntorno` | varchar | Sí | Texto libre adicional sobre el entorno |
| `tipoZona` | enum | Sí | `RESIDENCIAL`, `COMERCIAL`, `INDUSTRIAL`, `MIXTA`, `OTRA` |
| `tipoSuelo` | enum | Sí | `ANDEN`, `CALLE`, `SEPARADOR`, `PARQUE`, `OTRO` |
| `condicionesZona` | text[] | Sí | Selección múltiple: mal estado de vía, deterioro de andén, cambuches, falta de iluminación, otras |
| `poblacionHabitanteCalle` | boolean | Sí | Si hay población habitante de calle en la zona |
| `factoresAcumulacion` | text[] | Sí | Selección múltiple: contenedor mal ubicado/dañado, ausencia de contenedor, etc. |
| `camarasPunto` | enum | Sí | `NO_HAY`, `FUNCIONAMIENTO`, `MANTENIMIENTO`, `FUERA_DE_SERVICIO` — cámaras del C4 en el punto |
| `operadorAseo` | varchar | Sí | Operador de aseo del sector (UAESP, Promoambiental, etc.) |
| `recoleccionPuertaAPuerta` | boolean | Sí | Si hay recolección puerta a puerta en la zona |
| `m2Invasion` | double precision | Sí | Metros cuadrados de invasión del espacio público |
| `actoresIndisciplina` | text | Sí | Actores que generan indisciplina urbanística (texto libre) |
| `intervencionesPropuestas` | text | Sí | Intervenciones propuestas por el gestor |
| `identificacionGenerador` | enum | Sí | `SI`, `NO`, `PARCIALMENTE` — si se identificó al presunto responsable |
| `tipoGenerador` | enum | Sí | `COMUNIDAD`, `VIVIENDA`, `RESTAURANTE`, `BAR`, `TIENDA`, `SUPERMERCADO`, `PLAZA_MERCADO`, `OBRA_CONSTRUCCION`, `EMPRESA`, `TALLER`, `HABITANTE_CALLE`, `RECICLADOR`, `VOLQUETA`, `OTRO` |
| `nombreResponsable` | varchar | Sí | ⚠️ **Dato personal** — nombre del presunto responsable/establecimiento |
| `direccionResponsable` | varchar | Sí | ⚠️ **Dato personal** — dirección del presunto responsable |
| `observoDisposicion` | boolean | Sí | Si se observó directamente la disposición de residuos |
| `fechaObservacion` | timestamptz | Sí | Cuándo se observó |
| `metodoIdentificacion` | enum | Sí | `OBSERVACION_DIRECTA`, `INFO_COMUNIDAD`, `CAMARAS`, `FOTOGRAFIAS`, `DOCUMENTACION_RESIDUOS`, `INFO_OPERADOR_ASEO`, `OTRO` |
| `actoresEstrategicos` | text[] | Sí | Selección múltiple: JAC, administrador del sector, comerciante, empresa, alcaldía local, otro |
| `telefonoActor` | varchar | Sí | ⚠️ **Dato personal** — teléfono de contacto de un actor estratégico |
| `intervencionesRecomendadas` | text[] | Sí | Selección múltiple: limpieza inmediata, recolección de escombros, instalación de contenedor, etc. |

### Contadores del subtipo genérico (solo aplican a `tipoOperativo = GENERICO`)

| Columna | Tipo | Nulo | Significado |
|---|---|---|---|
| `puntosCriticosEmergentesAtendidos` | int | Sí | Cantidad de puntos críticos emergentes atendidos |
| `comparendosPedagogicos` | int | Sí | Cantidad de comparendos pedagógicos impuestos |
| `comparendos` | int | Sí | Cantidad de comparendos formales impuestos |
| `personasSensibilizadas` | int | Sí | Cantidad de personas sensibilizadas |
| `huertas` | int | Sí | Cantidad de huertas atendidas/creadas |
| `kgMaterialResiduosRecolectados` | double precision | Sí | Kilogramos de material recolectado |
| `m2RecuperadosEspacioPublico` | double precision | Sí | Metros cuadrados de espacio público recuperado |

### Estructura de `residuos` (JSON, no columnas separadas)

Cada elemento del arreglo:

| Campo | Tipo | Significado |
|---|---|---|
| `id` | string | Identificador del residuo dentro del punto |
| `tipoResiduo` | string | Tipo de residuo (ordinarios, voluminosos, escombros, orgánicos, plantas) |
| `quienDispuso` | string | Quién dispuso el residuo (comunidad, establecimientos, volquetas, habitantes de calle, no se conoce) |
| `dateTime` | string (ISO) | Fecha de identificación |
| `percibeOlores` / `percibeVectores` | boolean | Condiciones observadas |
| `areaLinealMetros` | number | Área estimada en metros |
| `observaciones` | string (opcional) | Notas del gestor |
| `photos` | string[] | Fotos de evidencia inicial |
| `recogido` | boolean | Si ya se recogió |
| `fechaRecogida` / `photosRecogida` | string / string[] (opcionales) | Cuándo y con qué evidencia se recogió |
| `createdByUserId` / `createdByNombre` | string (opcionales) | Quién agregó el residuo |
| `recogidoByUserId` / `recogidoByNombre` | string (opcionales) | Quién marcó la recolección — el nombre siempre lo asigna el backend desde el usuario autenticado, nunca lo envía el cliente |
| `notas` | array (opcional) | Notas de seguimiento: `{ id, fecha, autorId, autorNombre, texto }` |

---

## `punto_asignacion`

Vincula un punto con el gestor responsable.

| Columna | Tipo | Nulo | Significado |
|---|---|---|---|
| `puntoResiduoId` | uuid | No (PK) | El punto asignado (referencia a `puntos_residuo.id`) |
| `gestorId` | uuid | Sí | El gestor responsable (referencia a `users.id`); `null` = sin asignar |
| `updatedByUserId` | uuid | Sí | Quién hizo la última asignación/reasignación |
| `updatedAt` | timestamptz | No | Fecha de la última asignación |

---

## `ruta_semanal`

Rutas de recolección de un gestor, por semana calendario.

| Columna | Tipo | Nulo | Significado |
|---|---|---|---|
| `id` | uuid | No (PK) | Identificador único |
| `gestorId` | uuid | No | El gestor dueño de la ruta |
| `semanaInicio` / `semanaFin` | timestamptz | No | Límites de la semana (lunes 00:00 a domingo 23:59:59, hora Bogotá) |
| `estado` | varchar | No (default `en_progreso`) | `en_progreso`, `completada`, `cerrada` o `cancelada` |
| `paradas` | jsonb | No (default `[]`) | Arreglo de puntos a visitar: `{ puntoId, lat, lng, barrio, visitado }` |
| `segmentos` | jsonb | No (default `[]`) | Reservado para segmentación de la ruta (no usado activamente) |
| `arrastre` | jsonb | No (default `[]`) | IDs de puntos no visitados que se arrastran a la semana siguiente |
| `createdAt` / `updatedAt` | timestamptz | No | Auditoría estándar |

Hay un índice único en `(gestorId, semanaInicio)` — un gestor no puede tener
dos rutas para la misma semana.

---

## `procesos`

Agrupa varios puntos bajo un mismo proceso de seguimiento.

| Columna | Tipo | Nulo | Significado |
|---|---|---|---|
| `id` | uuid | No (PK) | Identificador único |
| `nombre` | varchar(255) | No | Nombre del proceso |
| `descripcion` | text | Sí | Descripción libre |
| `createdByUserId` | uuid | No | Quién creó el proceso |
| `status` | enum | No (default `ACTIVO`) | `ACTIVO`, `EN_SEGUIMIENTO`, `FINALIZADO` |
| `createdAt` / `updatedAt` | timestamptz | No | Auditoría estándar |
