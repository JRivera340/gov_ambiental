# Módulo Ambiental — Gestión de Puntos de Acumulación de Residuos

Sistema para reportar, validar y hacer seguimiento a puntos de acumulación de
residuos sólidos en la vía pública. Tres roles: quien reporta en campo
(Gestor Ambiental), quien valida y publica (Validador Ambiental), y quien
administra usuarios y ve indicadores agregados (Administrador).

Este documento explica cómo instalar y levantar el sistema completo en una
máquina nueva, sin haber visto el proyecto antes.

## Requisitos previos

- [Docker](https://www.docker.com/products/docker-desktop/) y Docker Compose
  (incluido en Docker Desktop). Versión 24 o superior recomendada.
- Ningún otro software es necesario — la base de datos, el backend y el
  frontend corren dentro de contenedores.

Ver `REQUERIMIENTOS.md` para el detalle de hardware y puertos.

## Instalación

1. Cloná el repositorio y entrá a la carpeta:
   ```bash
   git clone <url-del-repositorio>
   cd gov_ambiental
   ```

2. Copiá el archivo de variables de entorno de ejemplo:
   ```bash
   cp .env.example .env
   ```
   Los valores de ejemplo funcionan tal cual para probar en tu máquina. Antes
   de un uso real, cambiá al menos `JWT_SECRET` por un valor propio y
   aleatorio (ver `SEGURIDAD.md`).

3. Levantá todo el sistema con un solo comando:
   ```bash
   docker compose up -d --build
   ```
   Esto construye las imágenes de backend y frontend, levanta Postgres, y
   corre las migraciones de base de datos automáticamente antes de arrancar
   el backend. La primera vez tarda unos minutos (descarga de imágenes base
   y compilación); las siguientes veces es mucho más rápido.

4. Verificá que los tres servicios están arriba:
   ```bash
   docker compose ps
   ```
   Deberías ver `ambiental-db`, `ambiental-backend` y `ambiental-frontend`
   en estado `Up`/`healthy`.

## Cargar datos de prueba

Con los contenedores ya corriendo, ejecutá:

```bash
docker compose exec backend npm run seed
```

Esto crea:
- 5 usuarios de prueba (1 administrador, 1 validador, 3 gestores) — **todos
  ficticios**, ningún dato de persona real.
- 30 puntos de acumulación en distintos estados del ciclo de vida (borrador,
  enviada, aprobada, rechazada, publicada), con barrios y coordenadas reales
  de la localidad de Santa Fe (dato público) pero información y observaciones
  inventadas.
- 1 proceso de ejemplo, asignaciones repartidas entre los gestores, y 2 rutas
  semanales (una activa, una ya completada).

El seed no se puede correr dos veces sobre la misma base con datos ya
cargados — si ya hay puntos, lo detecta y no duplica nada.

## Ingresar al sistema

Abrí el navegador en **http://localhost:5173**.

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@ejemplo.local` | `Ambiental2026!` |
| Validador Ambiental | `validador@ejemplo.local` | `Ambiental2026!` |
| Gestor Ambiental (1 de 3) | `gestor1@ejemplo.local` | `Ambiental2026!` |

(Ver la salida del comando `seed` para los otros dos gestores de prueba —
`gestor2@ejemplo.local` y `gestor3@ejemplo.local`, misma contraseña.)

### Qué deberías ver en cada rol

- **Gestor Ambiental**: al entrar, un mapa/lista con los puntos que tiene
  asignados, y un botón para reportar un punto nuevo. Puede editar sus
  propios puntos mientras estén en borrador o hayan sido rechazados.
- **Validador Ambiental**: un panel con las actividades pendientes de
  validación (estado "Enviada") y un historial de lo ya validado. Puede
  aprobar, rechazar, editar y ver el mapa de residuos con puntos pendientes y
  validados.
- **Administrador**: panel con indicadores agregados del sector ambiental,
  asignación de puntos a gestores, y gestión de usuarios (crear, editar,
  activar/desactivar) en `/admin/usuarios`.

## Comandos útiles

```bash
docker compose up -d --build   # levantar todo (o reconstruir tras un cambio)
docker compose down            # detener todo (conserva los datos)
docker compose down -v         # detener y BORRAR los datos (empieza de cero)
docker compose logs -f backend # ver logs del backend en vivo
docker compose exec backend npm run seed   # cargar datos de prueba
```

## Documentación completa

Esta carpeta (`docs/`) contiene el resto de la documentación de entrega:

- `MANUAL-TECNICO.md` — arquitectura y estructura del código.
- `MANUAL-USUARIO.md` — guía funcional por rol, paso a paso.
- `MANUAL-ADMINISTRACION.md` — operación: usuarios, respaldos, mantenimiento.
- `MODELO-DATOS.md` — esquema de la base de datos con diagrama.
- `DICCIONARIO-DATOS.md` — cada tabla y columna, con su significado.
- `REQUERIMIENTOS.md` — hardware, software y puertos necesarios.
- `DEPENDENCIAS.md` — librerías usadas y sus licencias.
- `API.md` — endpoints del backend, uno por uno.
- `ROLES-PERMISOS.md` — qué puede hacer cada rol, en detalle.
- `SEGURIDAD.md` — recomendaciones para un despliegue real.
- `LIMITACIONES-CONOCIDAS.md` — qué no está terminado o tiene deuda técnica.
