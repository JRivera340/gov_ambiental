# Limitaciones conocidas y deuda técnica

Documento honesto de lo que no está terminado, lo que tiene limitaciones
conocidas, y lo que se dejó como deuda técnica deliberada. No es una lista
de bugs abiertos al azar — es lo que se sabe, explícitamente, al momento de
la entrega.

## Funcionalidad no verificada en pantalla

**Rutas semanales del gestor**: el backend (`/api/rutas-semanales/*`) y el
seed de datos de prueba (que crea 2 rutas, una activa y una completada)
funcionan y tienen tests unitarios sobre su lógica de cálculo de semanas
(`src/rutas-semanales/lib/`). Sin embargo, **la pantalla del frontend para
esta funcionalidad no se recorrió ni se verificó visualmente durante esta
entrega** — no hay garantía de que la experiencia de usuario esté completa
o libre de errores de interfaz. Es lo primero a revisar/probar antes de
depender de esta funcionalidad en un uso real.

## Estado `APROBADA` inalcanzable por el flujo normal

El ciclo de vida de un punto define 5 estados
(`BORRADOR → ENVIADA → APROBADA/RECHAZADA → PUBLICADA`), pero el endpoint de
aprobación (`POST /puntos/:id/approve`) pasa directo de `ENVIADA` a
`PUBLICADA`, sin detenerse en `APROBADA`. El estado existe en el enum y se
usa en el seed de datos de prueba (para poder mostrar esa tarjeta de estado
en la interfaz), pero ningún flujo real de la aplicación lo produce. No es
un bug — es una decisión de diseño heredada, documentada acá para que no
sorprenda a quien inspeccione el código o la base de datos.

## Sin integridad referencial a nivel de base de datos

Ninguna tabla tiene `FOREIGN KEY` declarada en Postgres — las relaciones
(`createdByUserId`, `gestorId`, `processId`, etc.) se resuelven en la capa
de aplicación. Esto significa que:

- Borrar un usuario no bloquea ni limpia las filas de `puntos_residuo`,
  `punto_asignacion` o `ruta_semanal` que lo referencian — quedan
  "huérfanas" (con un `uuid` que ya no corresponde a ningún usuario real).
- No hay borrado en cascada de archivos (fotos/actas) cuando se elimina el
  registro que las referencia — de hecho, no existe ningún endpoint para
  borrar un punto, así que en la práctica esto no se puede disparar desde
  la aplicación actual, pero sí manualmente contra la base de datos.

Ver `MANUAL-ADMINISTRACION.md` para cómo detectar filas huérfanas si hace
falta, y `MODELO-DATOS.md` para el detalle del modelo.

## Sin endpoint para eliminar un punto

No existe `DELETE /api/puntos/:id`. Un punto creado por error no se puede
borrar desde la aplicación — solo se puede corregir o dejar en un estado
que no avance. Si se necesita borrar uno, es una operación manual directa
contra la base de datos.

## Listas sin paginación de servidor

Ningún endpoint de listado (`GET /puntos`, `/asignaciones/all`, etc.) pagina
ni filtra del lado del servidor (salvo `desde`/`hasta` en algunos). El
frontend trae la lista completa y filtra/pagina en el navegador. Con pocos
cientos de puntos esto no se nota; con volúmenes mucho mayores (varios
miles de puntos activos) empezaría a impactar el tiempo de carga inicial de
cada pantalla.

## Sin protección contra fuerza bruta en el login

`POST /api/auth/login` no tiene límite de intentos ni bloqueo temporal tras
varios fallos. Para un despliegue expuesto a internet, se recomienda agregar
rate-limiting (por IP y/o por correo) delante de este endpoint — ver
`SEGURIDAD.md`.

## Sin integración continua (CI) incluida

El repositorio no incluye un workflow de CI (GitHub Actions o equivalente)
que corra automáticamente `tsc`/tests en cada cambio. Las suites de tests
existen y están en verde (`npm test` en el backend, `npm test` dentro de
`frontend/`), pero corren manualmente — no hay ninguna verificación
automática antes de que un cambio llegue a la rama principal.

## Almacenamiento local no apto para múltiples réplicas

Con `STORAGE_DRIVER=local` (el default), los archivos viven en el disco del
contenedor del backend. Si se corre más de una réplica del backend detrás
de un balanceador, cada réplica tendría su propio storage aislado — una
foto subida a través de una réplica no se vería desde otra. Para escalar
horizontalmente, cambiar a `STORAGE_DRIVER=s3` con un bucket compartido (ver
`MANUAL-ADMINISTRACION.md`).

## Licencia de `react-leaflet`

No es una limitación funcional, pero merece visibilidad: la librería de
mapas del frontend usa la Hippocratic License 2.1, que agrega una condición
de uso ético además de ser gratuita — ver el detalle en `DEPENDENCIAS.md`.

## Funcionalidades con verificación parcial

Durante esta entrega se verificó en vivo (contra una instancia real
levantada con `docker-compose`): login de los 3 roles, listado de puntos,
subida y descarga de fotos (ambos modos del flujo de storage local), y
creación de un punto completo con foto. **No se verificaron en vivo**: el
flujo completo de aprobar/rechazar desde la interfaz, la fusión de residuos
(`/puntos/merge`), la aprobación puntual de residuos en puntos genéricos
(`/puntos/:id/aprobar-residuo`), ni el módulo de sectores (parseo de KMZ).
El código de estas funcionalidades existe y tiene tests unitarios, pero no
se probó de punta a punta contra una base de datos real en esta ronda.
