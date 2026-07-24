# gov_ambiental_publico

Backend independiente del módulo Ambiental (puntos de residuos, procesos, rutas de gestores, sectores de recolección). Se conecta a `bogotaneidapp.com` compartiendo únicamente el `JWT_SECRET` — no comparte base de datos ni tabla de usuarios con el sistema principal.

## Correrlo en tu máquina (sin ningún dato ni credencial real)

1. Copiar `.env.example` a `.env` (los valores de ejemplo alcanzan para desarrollo local).
2. Levantar Postgres: `docker compose up -d`
3. Instalar dependencias: `npm install`
4. Levantar el backend: `npm run start:dev` (queda corriendo en modo watch — abrí una segunda terminal para los pasos 5 en adelante)
5. Poblar con datos ficticios: `npm run seed`
6. Generar un token de prueba (nunca se necesita el secreto real de producción):
   `npm run token:test GESTOR_AMBIENTAL`
7. Probar el endpoint de prueba:

```bash
curl -H "Authorization: Bearer <token-generado-en-el-paso-6>" http://localhost:3001/api/puntos/mine
```

## Qué NO incluye este repo

- Ningún dato real de producción — el seed crea un punto ficticio, nada más.
- Ninguna credencial real — `.env` está en `.gitignore`, solo se versiona `.env.example` con placeholders.
- Tabla de usuarios — la autenticación es solo verificación de firma JWT contra `JWT_SECRET`.
