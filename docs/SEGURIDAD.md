# Seguridad — recomendaciones para un despliegue real

Lo que viene configurado por defecto (`.env.example`) está pensado para
**probar el sistema en una máquina local**, no para producción. Antes de un
despliegue real, revisar cada punto de esta lista.

## HTTPS

El backend y el frontend, tal como se entregan, sirven tráfico en HTTP plano
(puertos 3001 y 80/5173). **Nunca exponer estos puertos directamente a
internet sin HTTPS delante.** Usar un proxy reverso (nginx, Caddy, Traefik)
o el balanceador del proveedor de nube con certificado TLS, y que sea ese
proxy el único punto expuesto públicamente. Sin HTTPS, el token JWT viaja
en texto plano en cada petición — cualquiera en la misma red puede
capturarlo y hacerse pasar por ese usuario.

## Manejo de secretos

- **`JWT_SECRET`**: el valor de `.env.example` (`cambia-este-valor-...`) es
  un placeholder — **cambiarlo obligatoriamente** por un valor largo y
  aleatorio antes de cualquier uso real (por ejemplo, `openssl rand -base64
  48`). Cualquiera con este valor puede firmar tokens válidos para
  cualquier usuario del sistema, incluido Administrador.
- **Contraseñas de usuarios**: se guardan hasheadas con bcrypt (10 rondas),
  nunca en texto plano, y nunca se devuelven en ninguna respuesta de la API.
- **`.env`** nunca debe subirse a control de versiones — ya está en
  `.gitignore`. Si se despliega con un orquestador (Docker Swarm,
  Kubernetes, un PaaS), usar su mecanismo de secretos en vez de un archivo
  `.env` en el disco del servidor.
- **Credenciales de S3** (si se usa `STORAGE_DRIVER=s3`): usar una política
  de acceso mínima (solo lectura/escritura sobre el bucket específico, no
  credenciales de cuenta completas).
- Si se cambia `JWT_SECRET`, todas las sesiones activas quedan invalidadas
  de inmediato (no hay downtime de datos, solo hay que volver a iniciar
  sesión).

## CORS

`CORS_ORIGIN` en `.env` debe listar exactamente el/los dominio(s) reales
del frontend en producción, separados por coma — nunca dejarlo abierto a
cualquier origen. El backend ya rechaza cualquier origen no listado.

## Contraseñas de usuarios

No hay política de complejidad de contraseña impuesta por el backend más
allá de un mínimo de 6 caracteres (ver `create-user.dto.ts`). Para un
despliegue real, considerar:
- Exigir contraseñas más largas/complejas al crear usuarios desde el panel
  de Administrador.
- Cambiar la contraseña de prueba (`Ambiental2026!`) de cualquier usuario
  de ejemplo antes de exponer el sistema.

## Respaldos

Ver `MANUAL-ADMINISTRACION.md` — un respaldo cifrado y guardado fuera del
servidor original es la recomendación mínima.

## Qué NO hacer

- **No** desplegar con los valores de ejemplo de `.env.example` tal cual
  (especialmente `JWT_SECRET` y las contraseñas del seed) en un entorno con
  datos reales.
- **No** exponer el puerto de Postgres (`5432`) a internet — en
  `docker-compose.yml` está mapeado al host para conveniencia de desarrollo
  local; en producción, quitar ese mapeo o restringirlo por firewall.
- **No** correr el seed de datos de prueba (`npm run seed`) contra una base
  de datos que ya tiene datos reales — está pensado solo para instalaciones
  nuevas/de prueba (aunque el script no duplica si ya hay puntos, sigue sin
  ser su propósito).
- **No** dar el rol `ADMIN` a más usuarios de los estrictamente necesarios —
  es el único rol que puede gestionar cuentas de otros usuarios.
- **No** asumir que HTTPS "ya viene incluido" — hay que configurarlo
  explícitamente delante del sistema, no es automático.
