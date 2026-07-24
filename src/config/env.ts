import { envSchema, type EnvVars } from './env.schema';

export function getEnv(): EnvVars {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    console.error('[ENV] Variables de entorno inválidas o faltantes:');
    Object.entries(errors).forEach(([key, messages]) => {
      console.error(`  - ${key}: ${messages?.join(', ') || 'falta'}`);
    });
    throw new Error(
      `Variables de entorno faltantes o inválidas: ${Object.keys(errors).join(', ')}`,
    );
  }
  return parsed.data;
}
