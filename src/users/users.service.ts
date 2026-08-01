import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './entities/user.entity';
import { Role } from '../common/enums/role.enum';

export type PublicUser = Omit<UserEntity, 'passwordHash'>;

function toPublic(user: UserEntity): PublicUser {
  const { passwordHash, ...rest } = user;
  return rest;
}

// Tabla propia — este módulo se autentica por sí mismo, sin depender de
// ningún sistema externo (reemplaza el proxy hacia el hub que tenían
// test/main/production).
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  // Usado solo por AuthService — es el único punto del código que necesita
  // passwordHash, por eso no pasa por toPublic().
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<PublicUser> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return toPublic(user);
  }

  async findGestores(): Promise<PublicUser[]> {
    const users = await this.repo.find({
      where: { role: In([Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN]), active: true },
      order: { name: 'ASC' },
    });
    return users.map(toPublic);
  }

  async findAll(): Promise<PublicUser[]> {
    const users = await this.repo.find({ order: { name: 'ASC' } });
    return users.map(toPublic);
  }

  async create(data: { name: string; lastname: string; email: string; password: string; role: Role }): Promise<PublicUser> {
    const existente = await this.findByEmail(data.email);
    if (existente) throw new ConflictException('Ya existe un usuario con ese correo');
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = this.repo.create({
      name: data.name,
      lastname: data.lastname,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      active: true,
    });
    return toPublic(await this.repo.save(user));
  }

  async update(id: string, data: { name?: string; lastname?: string; email?: string; role?: Role; password?: string }): Promise<PublicUser> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (data.email && data.email.toLowerCase() !== user.email) {
      const existente = await this.findByEmail(data.email);
      if (existente) throw new ConflictException('Ya existe un usuario con ese correo');
      user.email = data.email.toLowerCase();
    }
    if (data.name !== undefined) user.name = data.name;
    if (data.lastname !== undefined) user.lastname = data.lastname;
    if (data.role !== undefined) user.role = data.role;
    if (data.password) user.passwordHash = await bcrypt.hash(data.password, 10);

    return toPublic(await this.repo.save(user));
  }

  async setActive(id: string, active: boolean): Promise<PublicUser> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.active = active;
    return toPublic(await this.repo.save(user));
  }
}
