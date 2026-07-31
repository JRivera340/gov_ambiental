import { envSchema } from './env.schema';

describe('envSchema', () => {
  const base = {
    JWT_SECRET: 'secreto-de-prueba',
    DB_HOST: 'localhost',
    DB_USERNAME: 'user',
    DB_PASSWORD: 'pass',
    DB_DATABASE: 'ambiental',
    S3_ENDPOINT: 'https://s3.test.local',
    S3_BUCKET: 'bucket-test',
    S3_ACCESS_KEY_ID: 'key-id',
    S3_SECRET_ACCESS_KEY: 'secret-key',
  };

  it('acepta el set mínimo de variables y aplica defaults', () => {
    const result = envSchema.parse(base);
    expect(result.PORT).toBe(3001);
    expect(result.CORS_ORIGIN).toBe('http://localhost:5173');
  });

  it('rechaza cuando falta JWT_SECRET', () => {
    const { JWT_SECRET, ...rest } = base;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rechaza cuando falta configuración de base de datos', () => {
    const { DB_HOST, ...rest } = base;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
