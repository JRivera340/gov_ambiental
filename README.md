# gov_ambiental_publico

Backend independiente del módulo Ambiental (puntos de residuos, procesos, rutas de gestores, sectores de recolección). Puede compartir sesión con otro sistema de login usando el mismo `JWT_SECRET` (variable de entorno) — no comparte base de datos ni tabla de usuarios con nadie.

## Correrlo standalone, sin depender de ningún otro sistema

Nada en el código está atado a un dominio o secreto específico — todo lo que cambia entre despliegues es variable de entorno:
- `JWT_SECRET`: cualquier valor propio. Solo tiene que coincidir con el de otro sistema si vas a aceptar tokens que ese sistema emite (para compartir sesión sin duplicar usuarios). Si no, generá el tuyo y listo — cero conflicto posible, cada despliegue tiene el suyo.
- `CORS_ORIGIN`: el dominio de tu frontend.
- `FRONTEND_URL`: para el link del reporte XLSX.

No hay ningún dominio ni secreto hardcodeado en el código fuente — se puede confirmar corriendo `grep -r "bogotaneidapp" src` (debe dar vacío, salvo comentarios/tests).

## Correrlo en tu máquina (sin ningún dato ni credencial real)

1. Copiar `.env.example` a `.env` (los valores de ejemplo alcanzan para desarrollo local).
2. Levantar Postgres: `docker compose up -d`
3. Instalar dependencias: `npm install`
4. Levantar el backend: `npm run start:dev` (queda corriendo en modo watch — abrí una segunda terminal para los pasos 5 en adelante)
5. Poblar con datos ficticios: `npm run seed` — crea:
   - 1 proceso de ejemplo
   - 4 puntos, uno en cada estado del ciclo de vida (BORRADOR, ENVIADA, RECHAZADA, PUBLICADA), con residuos en distintos estados (pendiente, recogido, con nota) — para poder probar enviar, aprobar, rechazar, corregir y marcar recogido sin escribir nada a mano
   - 4 asignaciones (todas al gestor de prueba)
   - 1 ruta semanal en progreso con esos 4 puntos como paradas
6. Generar un token de prueba (nunca se necesita el secreto real de producción). Hay 3 identidades de prueba fijas — el seed le asigna sus datos al gestor:
   - `npm run token:test GESTOR_AMBIENTAL` (dueño de los 4 puntos sembrados)
   - `npm run token:test VALIDADOR_AMBIENTAL`
   - `npm run token:test ADMIN`
7. Probar con el token generado:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/puntos/mine
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/rutas-semanales/mine
```

## Qué NO incluye este repo

- Ningún dato real de producción — todo lo que crea el seed es ficticio (barrios/nombres/fotos son placeholders, no existen).
- Ninguna credencial real — `.env` está en `.gitignore`, solo se versiona `.env.example` con placeholders.
- Tabla de usuarios — la autenticación es solo verificación de firma JWT contra `JWT_SECRET`; las "identidades de prueba" son solo combinaciones fijas de id/email/rol para firmar tokens, no filas en ninguna tabla.
