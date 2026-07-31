import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // URL del frontend propio, usada como fallback en el link publico del reporte
  // XLSX cuando el cliente no lo manda explicito. Cada despliegue pone la suya.
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  JWT_SECRET: z.string(),

  // Backend del hub (gov-espacio-publico), para el proxy de resolucion de
  // usuarios por ID (ver PLAN-MAESTRO.md HITO 2, tarea 1 - getUserById).
  HUB_API_URL: z.string().default('https://backend-api-production-0ce4.up.railway.app'),

  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(5432),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_DATABASE: z.string(),

  // Storage de archivos (actas/fotos) - cliente compatible con S3, no
  // especifico de un proveedor. S3_ENDPOINT/S3_REGION permiten apuntar a R2,
  // AWS o cualquier otro compatible sin tocar codigo.
  S3_ENDPOINT: z.string(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_PUBLIC_URL: z.string().optional(),
});

export type EnvVars = z.infer<typeof envSchema>;
