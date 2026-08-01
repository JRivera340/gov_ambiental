import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { Role } from '../common/enums/role.enum';

describe('AuthService', () => {
  const usersServiceMock = { findByEmail: jest.fn() };
  const jwtServiceMock = { signAsync: jest.fn().mockResolvedValue('token-firmado') };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(usersServiceMock as any, jwtServiceMock as any);
  });

  it('login exitoso devuelve token y datos públicos del usuario', async () => {
    const passwordHash = await bcrypt.hash('clave123', 10);
    usersServiceMock.findByEmail.mockResolvedValue({
      id: 'u1', name: 'Ana', lastname: 'Gomez', email: 'ana@example.com',
      passwordHash, role: Role.GESTOR_AMBIENTAL, active: true,
    });

    const result = await service.login('ana@example.com', 'clave123');

    expect(result.accessToken).toBe('token-firmado');
    expect(result.user).toEqual({ id: 'u1', name: 'Ana', lastname: 'Gomez', email: 'ana@example.com', role: Role.GESTOR_AMBIENTAL });
    expect((result.user as any).passwordHash).toBeUndefined();
  });

  it('rechaza contraseña incorrecta', async () => {
    const passwordHash = await bcrypt.hash('clave123', 10);
    usersServiceMock.findByEmail.mockResolvedValue({
      id: 'u1', name: 'Ana', lastname: 'Gomez', email: 'ana@example.com',
      passwordHash, role: Role.GESTOR_AMBIENTAL, active: true,
    });

    await expect(service.login('ana@example.com', 'incorrecta')).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza usuario inexistente', async () => {
    usersServiceMock.findByEmail.mockResolvedValue(null);
    await expect(service.login('no-existe@example.com', 'clave123')).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza usuario desactivado aunque la contraseña sea correcta', async () => {
    const passwordHash = await bcrypt.hash('clave123', 10);
    usersServiceMock.findByEmail.mockResolvedValue({
      id: 'u1', name: 'Ana', lastname: 'Gomez', email: 'ana@example.com',
      passwordHash, role: Role.GESTOR_AMBIENTAL, active: false,
    });

    await expect(service.login('ana@example.com', 'clave123')).rejects.toThrow(UnauthorizedException);
  });
});
