import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';

const makeContext = (): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as any;

describe('JwtAuthGuard', () => {
  it('permite el paso sin autenticacion cuando la ruta esta marcada como publica', () => {
    const reflector = { getAllAndOverride: () => true } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('delega en la autenticacion JWT normal cuando la ruta no es publica', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    const superCanActivate = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true as any);

    const result = guard.canActivate(makeContext());

    expect(superCanActivate).toHaveBeenCalled();
    expect(result).toBe(true);
    superCanActivate.mockRestore();
  });
});
