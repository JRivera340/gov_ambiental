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
});

export type EnvVars = z.infer<typeof envSchema>;
