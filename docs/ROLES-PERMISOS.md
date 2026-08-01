# Roles y permisos

El sistema tiene exactamente 3 roles. No hay superusuario ni roles
adicionales — cualquier necesidad nueva de permisos requiere modificar el
enum `Role` (`src/common/enums/role.enum.ts`) y las reglas de negocio.

## Gestor Ambiental (`GESTOR_AMBIENTAL`)

Reporta puntos en campo y hace su seguimiento.

**Puede:**
- Crear puntos nuevos (quedan en `BORRADOR`).
- Editar sus propios puntos, solo mientras estén en `BORRADOR` o `RECHAZADA`.
- Reenviar un punto corregido a validación (`BORRADOR`/`RECHAZADA` → `ENVIADA`).
- Ver el detalle y el listado de sus propios puntos (`/puntos/mine`).
- Ver el listado completo de puntos (`GET /puntos`, sin filtro de dueño).
- Hacer seguimiento a los residuos de un punto: marcar como recogido, agregar
  un residuo nuevo, agregar/eliminar notas.
- Fusionar residuos de varios puntos en uno (`/puntos/merge`).
- Ver y gestionar su ruta semanal de recolección.
- Ver la lista de gestores/validadores/admins (para selectores de
  "acompañantes").
- Descargar el reporte Excel de puntos pendientes de recolección.

**No puede:**
- Editar un punto ajeno.
- Editar un punto propio que ya esté `ENVIADA` o `PUBLICADA`.
- Aprobar o rechazar ningún punto.
- Gestionar usuarios.
- Asignar puntos a otros gestores.

## Validador Ambiental (`VALIDADOR_AMBIENTAL`)

Revisa lo reportado por los gestores y decide si se publica.

**Puede:**
- Ver los puntos pendientes de validación (`ENVIADA`).
- Aprobar un punto (pasa a `PUBLICADA`, queda visible en el mapa público).
- Rechazar un punto con una observación obligatoria (vuelve al gestor en
  `RECHAZADA`).
- Editar un punto, solo mientras esté en `ENVIADA`.
- Aprobar residuos puntuales dentro de un punto de tipo `GENERICO`.
- Hacer seguimiento a residuos (marcar recogido, agregar residuo/nota) igual
  que un gestor.
- Ver el mapa de residuos y el historial completo de validaciones.
- Descargar el reporte Excel.

**No puede:**
- Crear puntos nuevos.
- Editar un punto en cualquier otro estado que no sea `ENVIADA`.
- Gestionar usuarios ni asignar puntos.

## Administrador (`ADMIN`)

Supervisión general y administración del sistema.

**Puede:**
- Todo lo que puede ver un Validador (indicadores, mapa, historial).
- Editar cualquier punto, en cualquier estado.
- Ver y gestionar todas las asignaciones (asignar/reasignar puntos a
  gestores, ver puntos sin asignar).
- Ver y gestionar todos los procesos.
- **Gestionar usuarios**: crear, editar (nombre, correo, rol, contraseña),
  activar y desactivar cuentas — el único rol que puede hacerlo.

**No puede:**
- Crear puntos nuevos (esa acción es exclusiva del rol Gestor).
- Aprobar/rechazar como si fuera el Validador — sí puede, mediante los
  mismos endpoints de aprobar/rechazar (`ADMIN` está autorizado en esos
  endpoints igual que `VALIDADOR_AMBIENTAL`), pero conceptualmente su rol
  en el flujo es de supervisión, no de operación diaria.

## Resumen — quién puede hacer qué

| Acción | Gestor | Validador | Admin |
|---|:---:|:---:|:---:|
| Crear punto | ✅ | ❌ | ❌ |
| Editar punto propio en borrador/rechazado | ✅ | — | ✅ |
| Editar punto en `ENVIADA` | ❌ | ✅ | ✅ |
| Aprobar / rechazar | ❌ | ✅ | ✅ |
| Ver puntos pendientes | ❌ | ✅ | ✅ |
| Hacer seguimiento a residuos | ✅ | ✅ | ✅ |
| Gestionar rutas semanales | ✅ | ❌ | ❌ (visualiza vía indicadores) |
| Asignar puntos a gestores | ❌ | ❌ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ✅ |
| Ver mapa público de puntos publicados | Sí (es público, sin sesión) | | |
