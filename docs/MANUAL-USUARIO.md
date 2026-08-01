# Manual de usuario

Guía funcional del sistema, por rol. Para credenciales de prueba y cómo
levantar el sistema, ver `README.md`.

## Ingresar al sistema

En la pantalla de inicio (`/login`), ingresá tu correo y contraseña. Según tu
rol, el sistema te lleva automáticamente a tu panel correspondiente.

---

## Rol: Gestor Ambiental

Es quien reporta puntos de acumulación de residuos en campo y hace el
seguimiento de su recolección.

### Reportar un punto nuevo

1. Desde el panel principal, elegí "Registrar punto".
2. Marcá la ubicación en el mapa (o usá el botón de ubicación actual) — el
   sistema detecta el barrio automáticamente.
3. Completá el formulario: frecuencia de acumulación, tipo de zona, tipo de
   suelo, condiciones observadas, si se identificó al generador, etc.
4. Agregá uno o más residuos: tipo de residuo, quién lo dispuso, si se
   perciben olores o vectores (roedores, insectos), área estimada, y foto de
   evidencia.
5. Al guardar, el punto queda en estado **Borrador** — todavía no es visible
   para el validador. Podés seguir editándolo.
6. Cuando esté listo, usá "Guardar y Reenviar a Validación" para pasarlo a
   estado **Enviada**.

### Corregir un punto rechazado

Si un validador rechaza tu punto, volvés a verlo en tu panel con las
observaciones del validador visibles arriba del formulario. Corregí lo que
haga falta y reenvialo — vuelve a pasar a **Enviada**.

### Marcar un residuo como recogido

Entrá al detalle del punto, elegí "Hacer Seguimiento" sobre el residuo
correspondiente, subí la foto de la recolección y confirmá. El residuo queda
marcado como recogido, con fecha y evidencia.

### Rutas semanales

En la vista de rutas, ves tus puntos asignados agrupados por semana. Podés
marcar cada parada como visitada a medida que recorrés tu ruta.

**Nota**: esta funcionalidad no se verificó en pantalla durante la entrega —
ver `LIMITACIONES-CONOCIDAS.md`.

---

## Rol: Validador Ambiental

Es quien revisa los puntos reportados por los gestores y decide si se
publican o se devuelven para corrección.

### Ver actividades pendientes

El panel principal muestra la lista de puntos en estado **Enviada**,
esperando revisión. Podés filtrar por barrio, gestor, tipo, o buscar por
número de punto.

### Aprobar o rechazar un punto

1. Entrá al detalle del punto (o abrilo desde el mapa).
2. Revisá la información, los residuos reportados y las fotos.
3. Elegí "Aprobar" (el punto pasa a **Publicada** y queda visible en el mapa
   público) o "Rechazar" (volvé con una observación obligatoria explicando
   qué falta corregir — el punto vuelve al gestor en estado **Rechazada**).
4. También podés "Editar" el punto vos mismo antes de aprobarlo, si el ajuste
   es menor.

### Mapa de residuos

Vista de mapa con todos los puntos, coloreados según si están validados o
pendientes. Podés cambiar entre modo "Actividad" (ver el punto completo) y
modo "Residuos" (ver el detalle de cada residuo y su estado de recolección).
El filtro de fecha por defecto muestra el mes actual — cambialo a "Anual" si
buscás un punto de otro período.

### Historial de validaciones

Lista de todo lo ya aprobado o rechazado, ordenado por fecha de validación
(lo más reciente primero). Por defecto muestra el año actual.

---

## Rol: Administrador

Ve indicadores agregados, asigna puntos a gestores, y gestiona los usuarios
del sistema.

### Panel principal

Indicadores del sector ambiental: puntos por estado, mapa general, filtros
por período.

### Asignar puntos a gestores

Desde el panel de asignación, elegí un punto sin asignar (o reasigná uno ya
asignado) y seleccioná el gestor responsable.

### Gestión de usuarios

En `/admin/usuarios`:

- **Crear usuario**: nombre, apellido, correo, contraseña inicial y rol
  (Administrador, Gestor Ambiental o Validador Ambiental).
- **Editar usuario**: cambiar nombre, correo o rol. La contraseña solo se
  actualiza si escribís una nueva — dejar el campo vacío la conserva.
- **Desactivar/Activar**: un usuario desactivado no puede iniciar sesión,
  pero sus datos históricos (puntos creados, validaciones hechas) se
  conservan intactos.
