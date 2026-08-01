import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { Role } from '../common/enums/role.enum';
import { UserEntity } from './entities/user.entity';

function makeRepoMock() {
  const rows: UserEntity[] = [];
  return {
    rows,
    find: jest.fn(async (opts: any) => {
      let result = rows;
      if (opts?.where?.role?.value) {
        result = result.filter((r) => opts.where.role.value.includes(r.role));
      }
      if (opts?.where?.active !== undefined) {
        result = result.filter((r) => r.active === opts.where.active);
      }
      return [...result];
    }),
    findOne: jest.fn(async (opts: any) => {
      if (opts?.where?.id) return rows.find((r) => r.id === opts.where.id) ?? null;
      if (opts?.where?.email) return rows.find((r) => r.email === opts.where.email) ?? null;
      return null;
    }),
    create: jest.fn((data: Partial<UserEntity>) => ({ ...data }) as UserEntity),
    save: jest.fn(async (user: UserEntity) => {
      const idx = rows.findIndex((r) => r.id === user.id);
      const saved = { ...user, id: user.id ?? `id-${rows.length + 1}` } as UserEntity;
      if (idx >= 0) rows[idx] = saved;
      else rows.push(saved);
      return saved;
    }),
  };
}

describe('UsersService', () => {
  let repo: ReturnType<typeof makeRepoMock>;
  let service: UsersService;

  beforeEach(() => {
    repo = makeRepoMock();
    service = new UsersService(repo as any);
  });

  it('create hashea la contraseña y no la expone en el resultado', async () => {
    const created = await service.create({ name: 'Ana', lastname: 'Gomez', email: 'ana@example.com', password: 'clave123', role: Role.GESTOR_AMBIENTAL });

    expect((created as any).passwordHash).toBeUndefined();
    expect(created.email).toBe('ana@example.com');
    const stored = repo.rows[0];
    expect(stored.passwordHash).not.toBe('clave123');
    expect(await bcrypt.compare('clave123', stored.passwordHash)).toBe(true);
  });

  it('create rechaza un correo duplicado', async () => {
    await service.create({ name: 'Ana', lastname: 'Gomez', email: 'ana@example.com', password: 'clave123', role: Role.GESTOR_AMBIENTAL });
    await expect(
      service.create({ name: 'Otro', lastname: 'Nombre', email: 'ANA@example.com', password: 'clave456', role: Role.ADMIN }),
    ).rejects.toThrow(ConflictException);
  });

  it('findByEmail es case-insensitive', async () => {
    await service.create({ name: 'Ana', lastname: 'Gomez', email: 'ana@example.com', password: 'clave123', role: Role.GESTOR_AMBIENTAL });
    const found = await service.findByEmail('ANA@EXAMPLE.COM');
    expect(found?.email).toBe('ana@example.com');
  });

  it('update cambia campos y rehashea la contraseña solo si se envía una nueva', async () => {
    const created = await service.create({ name: 'Ana', lastname: 'Gomez', email: 'ana@example.com', password: 'clave123', role: Role.GESTOR_AMBIENTAL });
    const oldHash = repo.rows[0].passwordHash;

    const updated = await service.update(created.id, { name: 'Ana María' });
    expect(updated.name).toBe('Ana María');
    expect(repo.rows[0].passwordHash).toBe(oldHash);

    await service.update(created.id, { password: 'nuevaClave789' });
    expect(repo.rows[0].passwordHash).not.toBe(oldHash);
  });

  it('update lanza NotFoundException si el usuario no existe', async () => {
    await expect(service.update('no-existe', { name: 'X' })).rejects.toThrow(NotFoundException);
  });

  it('setActive desactiva y reactiva un usuario', async () => {
    const created = await service.create({ name: 'Ana', lastname: 'Gomez', email: 'ana@example.com', password: 'clave123', role: Role.GESTOR_AMBIENTAL });

    const desactivado = await service.setActive(created.id, false);
    expect(desactivado.active).toBe(false);

    const reactivado = await service.setActive(created.id, true);
    expect(reactivado.active).toBe(true);
  });

  it('findGestores solo devuelve usuarios activos con rol de gestor/validador/admin', async () => {
    await service.create({ name: 'Gestor', lastname: 'Uno', email: 'g1@example.com', password: 'clave123', role: Role.GESTOR_AMBIENTAL });
    const inactivo = await service.create({ name: 'Gestor', lastname: 'Inactivo', email: 'g2@example.com', password: 'clave123', role: Role.GESTOR_AMBIENTAL });
    await service.setActive(inactivo.id, false);

    const result = await service.findGestores();
    expect(result.map((u) => u.email)).toEqual(['g1@example.com']);
  });
});
