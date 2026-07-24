import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../../common/enums/role.enum';

const makeContext = (role: Role | undefined): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined, method: 'GET', url: '/x' }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as any;

describe('RolesGuard', () => {
  it('permite cuando no hay roles requeridos', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext(Role.ADMIN))).toBe(true);
  });

  it('permite cuando el rol del usuario está en la lista requerida', () => {
    const reflector = { getAllAndOverride: () => [Role.GESTOR_AMBIENTAL] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeContext(Role.GESTOR_AMBIENTAL))).toBe(true);
  });

  it('rechaza cuando el rol del usuario no está en la lista requerida', () => {
    const reflector = { getAllAndOverride: () => [Role.ADMIN] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(makeContext(Role.GESTOR_AMBIENTAL))).toThrow();
  });

  it('rechaza cuando no hay usuario en la petición', () => {
    const reflector = { getAllAndOverride: () => [Role.ADMIN] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow();
  });
});
