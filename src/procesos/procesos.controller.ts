import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ProcesosService } from './procesos.service';

@Controller('procesos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProcesosController {
  constructor(private readonly procesosService: ProcesosService) {}

  @Post()
  @Roles(Role.GESTOR_AMBIENTAL)
  create(@Req() req: any, @Body() body: { nombre: string; descripcion?: string }) {
    return this.procesosService.create(req.user.userId, body);
  }

  @Get('mine')
  @Roles(Role.GESTOR_AMBIENTAL)
  listMine(@Req() req: any) {
    return this.procesosService.listMine(req.user.userId);
  }

  @Get('all')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  listAll() {
    return this.procesosService.listAll();
  }

  @Get(':id')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  getOne(@Param('id') id: string) {
    return this.procesosService.getOne(id);
  }

  @Patch(':id')
  @Roles(Role.GESTOR_AMBIENTAL)
  update(@Req() req: any, @Param('id') id: string, @Body() body: { nombre?: string; descripcion?: string }) {
    return this.procesosService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.procesosService.remove(id);
  }
}
