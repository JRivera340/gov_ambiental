# Modelo de datos

5 tablas. Sin relaciones declaradas a nivel de base de datos (sin `FOREIGN
KEY`) — las referencias entre tablas se resuelven en la capa de aplicación,
no con constraints de Postgres. Ver `DICCIONARIO-DATOS.md` para el detalle
columna por columna.

## Diagrama

```mermaid
erDiagram
    USERS ||--o{ PUNTOS_RESIDUO : "crea (createdByUserId)"
    USERS ||--o{ PUNTO_ASIGNACION : "es el gestor (gestorId)"
    USERS ||--o{ RUTA_SEMANAL : "es el gestor (gestorId)"
    USERS ||--o{ PROCESOS : "crea (createdByUserId)"
    PUNTOS_RESIDUO ||--o| PUNTO_ASIGNACION : "tiene (puntoResiduoId)"
    PUNTOS_RESIDUO }o--o| PROCESOS : "pertenece a (processId)"

    USERS {
        uuid id PK
        varchar name
        varchar lastname
        varchar email UK
        varchar passwordHash
        varchar role
        boolean active
        timestamptz createdAt
        timestamptz updatedAt
    }

    PUNTOS_RESIDUO {
        uuid id PK
        uuid createdByUserId
        enum status
        enum tipoOperativo
        timestamptz dateTime
        double lat
        double lng
        varchar barrio
        text_array photos
        jsonb residuos
        uuid validatorUserId
        timestamptz validatedAt
        uuid processId
        int pointNumber
        "... 26 columnas del formulario fijo" extra
        timestamptz createdAt
        timestamptz updatedAt
    }

    PUNTO_ASIGNACION {
        uuid puntoResiduoId PK
        uuid gestorId
        uuid updatedByUserId
        timestamptz updatedAt
    }

    RUTA_SEMANAL {
        uuid id PK
        uuid gestorId
        timestamptz semanaInicio
        timestamptz semanaFin
        varchar estado
        jsonb paradas
        jsonb segmentos
        jsonb arrastre
        timestamptz createdAt
        timestamptz updatedAt
    }

    PROCESOS {
        uuid id PK
        varchar nombre
        text descripcion
        uuid createdByUserId
        enum status
        timestamptz createdAt
        timestamptz updatedAt
    }
```

## Notas sobre el modelo

- **`PUNTO_ASIGNACION`** tiene su clave primaria en `puntoResiduoId` (no un
  `id` propio) — es, en la práctica, una relación 1 a 1 con `PUNTOS_RESIDUO`
  modelada como tabla aparte para poder reasignar sin tocar la fila del
  punto ni perder el historial de quién lo reasignó (`updatedByUserId`).
- **`PUNTOS_RESIDUO.residuos`** es un arreglo JSON, no una tabla — cada
  elemento representa un residuo identificado en el punto, con su propio
  ciclo de recolección (pendiente → recogido). Las notas de seguimiento de
  cada residuo también viven anidadas ahí (`residuos[].notas`).
- **`RUTA_SEMANAL.paradas`** es un arreglo JSON de puntos a visitar esa
  semana, cada uno con su coordenada y si ya fue visitado.
- Ninguna tabla tiene `ON DELETE CASCADE` ni constraints de integridad
  referencial a nivel de Postgres — borrar una fila de `USERS` o
  `PUNTOS_RESIDUO` no arrastra ni bloquea el borrado de las filas que la
  referencian en otras tablas (ver `LIMITACIONES-CONOCIDAS.md`).
- Los enums (`status`, `tipoOperativo`, y los 7 enums del formulario fijo:
  `FrecuenciaAcumulacion`, `TipoZona`, `TipoSuelo`, `CamarasPunto`,
  `IdentificacionGenerador`, `TipoGenerador`, `MetodoIdentificacion`) se
  implementan como tipos `ENUM` nativos de Postgres — ver
  `DICCIONARIO-DATOS.md` para los valores posibles de cada uno.

## Migraciones

El esquema se versiona con migraciones de TypeORM en `src/migrations/`,
corridas en orden por timestamp. Corren automáticamente al arrancar el
contenedor del backend (ver `docker-entrypoint.sh`) — no requieren
intervención manual.
