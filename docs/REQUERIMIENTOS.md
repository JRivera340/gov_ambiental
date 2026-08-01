# Requerimientos

## Para levantar el sistema con Docker (recomendado)

| Recurso | Mínimo | Recomendado |
|---|---|---|
| CPU | 2 núcleos | 4 núcleos |
| Memoria RAM | 4 GB libres | 8 GB libres |
| Almacenamiento | 5 GB libres (imágenes + datos) | 20 GB libres (con margen para fotos subidas) |
| Software | Docker 24+ con Docker Compose | Docker Desktop (Windows/Mac) o Docker Engine + Compose plugin (Linux) |

No se necesita instalar Node.js, Postgres, ni ninguna otra dependencia en la
máquina host — todo corre dentro de los contenedores.

## Puertos usados

| Puerto | Servicio | Uso |
|---|---|---|
| `5173` | Frontend (nginx) | Interfaz web — es lo que abre el usuario en el navegador |
| `3001` | Backend (API) | API REST, consumida por el frontend y por integraciones externas si las hubiera |
| `5432` | Postgres | Base de datos — expuesto al host para poder conectarse con un cliente de escritorio (DBeaver, TablePlus, psql) si hace falta |

Si alguno de estos puertos ya está en uso en la máquina, cambiar el mapeo en
`docker-compose.yml` (por ejemplo `"8080:80"` en vez de `"5173:80"` para el
frontend).

## Versiones de runtime (para desarrollo sin Docker)

Si se quiere correr el backend o el frontend directamente en la máquina
(sin contenedores), para desarrollo:

| Componente | Versión |
|---|---|
| Node.js | 20.x (LTS) |
| npm | 10.x |
| PostgreSQL | 16.x |

## Servicios externos

**Ninguno es obligatorio.** El sistema funciona de forma completamente
autosuficiente con `STORAGE_DRIVER=local` (almacenamiento de archivos en
disco).

Opcional: un proveedor de almacenamiento compatible con S3 (AWS S3,
Cloudflare R2, MinIO, Backblaze B2, etc.) si se prefiere `STORAGE_DRIVER=s3`
para un despliegue con múltiples réplicas del backend — ver
`MANUAL-ADMINISTRACION.md`, sección "Escalado".

## Navegadores soportados (frontend)

Navegadores modernos con soporte de ES2020+: Chrome/Edge/Firefox/Safari en
sus últimas 2 versiones mayores. No se probó ni se optimizó para
Internet Explorer.
