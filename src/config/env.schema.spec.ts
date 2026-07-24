import { envSchema } from './env.schema';

describe('envSchema', () => {
  const base = {
    JWT_SECRET: 'secreto-de-prueba',
    DB_HOST: 'localhost',
    DB_USERNAME: 'user',
    DB_PASSWORD: 'pass',
    DB_DATABASE: 'ambiental',
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
