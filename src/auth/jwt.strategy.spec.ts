import { JwtStrategy } from './jwt.strategy';
import { Role } from '../common/enums/role.enum';

describe('JwtStrategy', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'secreto-de-prueba';
    process.env.DB_HOST = 'localhost';
    process.env.DB_USERNAME = 'user';
    process.env.DB_PASSWORD = 'pass';
    process.env.DB_DATABASE = 'ambiental';
    process.env.S3_ENDPOINT = 'https://s3.test.local';
    process.env.S3_BUCKET = 'bucket-test';
    process.env.S3_ACCESS_KEY_ID = 'key-id';
    process.env.S3_SECRET_ACCESS_KEY = 'secret-key';
  });

  it('mapea el payload del token a req.user sin consultar ninguna base de datos', async () => {
    const strategy = new JwtStrategy();
    const result = await strategy.validate({
      sub: 'user-123',
      email: 'gestor@test.com',
      role: Role.GESTOR_AMBIENTAL,
    });
    expect(result).toEqual({
      userId: 'user-123',
      email: 'gestor@test.com',
      role: Role.GESTOR_AMBIENTAL,
    });
  });
});
