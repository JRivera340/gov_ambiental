import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { UsersService } from './users.service';

const mockUser = {
  id: 'user-1',
  name: 'Ana',
  lastname: 'Gomez',
  email: 'ana@example.com',
  role: 'GESTOR_AMBIENTAL',
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('UsersService', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.HUB_API_URL = 'https://hub.test';
    process.env.JWT_SECRET = 'secret';
    process.env.DB_HOST = 'localhost';
    process.env.DB_USERNAME = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.DB_DATABASE = 'd';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('findById pide al hub y devuelve el usuario', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUser,
    });
    global.fetch = fetchMock as any;

    const service = new UsersService();
    const result = await service.findById('user-1', 'token-abc');

    expect(result).toEqual(mockUser);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://hub.test/api/users/user-1',
      expect.objectContaining({ headers: { Authorization: 'Bearer token-abc' } }),
    );
  });

  it('findById cachea y no vuelve a pedir al hub dentro del TTL', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUser,
    });
    global.fetch = fetchMock as any;

    const service = new UsersService();
    await service.findById('user-1', 'token-abc');
    await service.findById('user-1', 'token-abc');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('findById propaga el status del hub cuando falla', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Usuario no encontrado',
    });
    global.fetch = fetchMock as any;

    const service = new UsersService();
    await expect(service.findById('user-x', 'token-abc')).rejects.toThrow(HttpException);
  });

  it('findById falla rapido (no se cuelga) si el hub nunca responde', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn((_url: string, opts: any) => new Promise((_resolve, reject) => {
      opts.signal.addEventListener('abort', () => {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        reject(err);
      });
    }));
    global.fetch = fetchMock as any;

    const service = new UsersService();
    const pending = service.findById('user-1', 'token-abc');
    const assertion = expect(pending).rejects.toThrow(ServiceUnavailableException);

    await jest.advanceTimersByTimeAsync(4_000);
    await assertion;

    jest.useRealTimers();
  });

  it('findGestores cachea por rol del que llama', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockUser],
    });
    global.fetch = fetchMock as any;

    const service = new UsersService();
    await service.findGestores('GESTOR_AMBIENTAL', 'token-a');
    await service.findGestores('GESTOR_AMBIENTAL', 'token-b');
    await service.findGestores('ADMIN', 'token-c');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
