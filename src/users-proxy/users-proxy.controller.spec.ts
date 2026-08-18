import { HttpException } from '@nestjs/common';
import { UsersProxyController } from './users-proxy.controller';

describe('UsersProxyController', () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    process.env.JWT_SECRET = 'secreto-de-prueba';
    process.env.DB_HOST = 'localhost';
    process.env.DB_USERNAME = 'user';
    process.env.DB_PASSWORD = 'pass';
    process.env.DB_DATABASE = 'ambiental';
    process.env.HUB_API_URL = 'https://hub.test';
  });

  afterEach(() => { global.fetch = originalFetch; jest.resetAllMocks(); });

  it('reenvia el Authorization header al hub y devuelve su body', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: 'g1', name: 'Ana' }],
    });
    global.fetch = mockFetch as any;

    const controller = new UsersProxyController();
    const req = { headers: { authorization: 'Bearer token-123' } };
    const result = await controller.getGestores(req as any);

    expect(result).toEqual([{ id: 'g1', name: 'Ana' }]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/gestores/list'),
      { headers: { Authorization: 'Bearer token-123' } },
    );
  });

  it('propaga el status del hub cuando responde con error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    }) as any;

    const controller = new UsersProxyController();
    const req = { headers: { authorization: 'Bearer bad' } };

    await expect(controller.getGestores(req as any)).rejects.toMatchObject(
      new HttpException({ message: 'Unauthorized' }, 401),
    );
  });

  it('devuelve 502 si no puede contactar al hub', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as any;

    const controller = new UsersProxyController();
    const req = { headers: {} };

    await expect(controller.getGestores(req as any)).rejects.toMatchObject(
      new HttpException('No se pudo contactar al hub de usuarios', 502),
    );
  });
});
