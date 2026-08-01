import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // URL del frontend propio, usada como fallback en el link publico del reporte
  // XLSX cuando el cliente no lo manda explicito. Cada despliegue pone la suya.
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  JWT_SECRET: z.string(),

  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(5432),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_DATABASE: z.string(),

  // Storage de archivos (actas/fotos). 'local' (default) guarda en disco sin
  // configurar nada externo — pensado para instalar el módulo standalone.
  // 'S3' usa un cliente compatible con S3 (R2, AWS o cualquier otro), no
  // especifico de un proveedor.
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  // Carpeta local de archivos cuando STORAGE_DRIVER=local. Relativa al cwd
  // del proceso (en Docker, un volumen montado ahi para persistir entre
  // reinicios del contenedor).
  UPLOADS_DIR: z.string().default('uploads'),
  // URL publica bajo la que este backend sirve /api — usada para construir
  // el link de descarga de archivos en modo local (no aplica en modo S3,
  // que ya tiene su propia URL publica via S3_PUBLIC_URL).
  API_PUBLIC_URL: z.string().default('http://localhost:3001'),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
});

export type EnvVars = z.infer<typeof envSchema>;
