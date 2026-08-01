# Manual de administración y operación

Guía para quien opera el sistema día a día (no para quien lo usa desde la
UI de Administrador dentro de la aplicación — para eso ver
`MANUAL-USUARIO.md`).

## Gestión de usuarios

Desde `/admin/usuarios` en la propia aplicación (ver `MANUAL-USUARIO.md`) se
puede crear, editar, activar y desactivar usuarios sin necesidad de tocar la
base de datos directamente. Es la vía recomendada para el día a día.

Para crear el primer usuario administrador en una instalación nueva (antes
de que exista ningún usuario), usá el seed de datos de prueba
(`docker compose exec backend npm run seed`, ver `README.md`) o insertá el
usuario a mano contra la base de datos con una contraseña ya hasheada con
bcrypt (10 rondas, igual que `scripts/seed.ts`).

## Respaldos (backups)

La base de datos vive en un volumen Docker (`ambiental-db-data`). Para un
respaldo manual:

```bash
docker compose exec db pg_dump -U ambiental ambiental > respaldo-$(date +%Y%m%d).sql
```

Para restaurar:

```bash
docker compose exec -T db psql -U ambiental ambiental < respaldo-20260101.sql
```

Los archivos subidos (fotos, actas) en modo `STORAGE_DRIVER=local` viven en
el volumen `ambiental-uploads`. Para respaldarlos:

```bash
docker run --rm -v gov_ambiental_ambiental-uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-$(date +%Y%m%d).tar.gz -C /data .
```

Recomendación para un despliegue real: automatizar ambos respaldos con una
tarea programada (cron) y copiarlos fuera de la máquina donde corre Docker
(otro servidor, almacenamiento en la nube, etc.) — un respaldo que vive en
el mismo disco que los datos originales no protege contra una falla de
disco.

## Monitoreo

El sistema no trae un dashboard de monitoreo propio. Para un despliegue
real, como mínimo:

- **Logs**: `docker compose logs -f backend` (o el equivalente de tu
  orquestador si no usás docker-compose directamente en producción).
- **Salud del backend**: `GET /api/health` devuelve `200 OK` si el proceso
  está vivo (no verifica la conexión a la base de datos).
- **Espacio en disco**: si usás `STORAGE_DRIVER=local`, el volumen de
  archivos crece con cada foto subida — monitoreá el espacio disponible.

## Tareas de mantenimiento

- **Migraciones de esquema**: corren automáticamente al arrancar el
  contenedor del backend (`docker-entrypoint.sh`). No requieren intervención
  manual en el uso normal.
- **Actualizar dependencias**: revisar `DEPENDENCIAS.md` y correr
  `npm outdated` (backend) / `npm outdated` (frontend, dentro de
  `frontend/`) periódicamente. Cualquier actualización debe pasar por la
  suite de tests antes de desplegarse.
- **Rotar `JWT_SECRET`**: invalida todas las sesiones activas (todos los
  usuarios tienen que volver a iniciar sesión). No hay downtime de datos,
  solo de sesión.
- **Limpiar archivos huérfanos**: si un punto se borra pero sus fotos no (no
  hay borrado en cascada de archivos), esos archivos quedan en el storage
  sin referencia. No hay una tarea automática para esto — ver
  `LIMITACIONES-CONOCIDAS.md`.

## Escalado

Con `STORAGE_DRIVER=local`, los archivos viven en el disco del contenedor
del backend — si corrés más de una réplica del backend, cada una tendría su
propio storage y las fotos subidas a una réplica no se verían desde otra.
Para correr múltiples réplicas del backend, cambiar a `STORAGE_DRIVER=s3`
con un bucket compartido (ver `.env.example` y `SEGURIDAD.md`).
