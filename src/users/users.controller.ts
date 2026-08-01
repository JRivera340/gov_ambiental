import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('gestores/list')
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  findGestores() {
    return this.usersService.findGestores();
  }

  // Gestión de usuarios — solo ADMIN.
  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/desactivar')
  @Roles(Role.ADMIN)
  deactivate(@Param('id') id: string) {
    return this.usersService.setActive(id, false);
  }

  @Patch(':id/activar')
  @Roles(Role.ADMIN)
  activate(@Param('id') id: string) {
    return this.usersService.setActive(id, true);
  }
}
