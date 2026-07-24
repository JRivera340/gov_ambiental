import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AsignacionesService } from './asignaciones.service';

@Controller('asignaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AsignacionesController {
  constructor(private readonly asignacionesService: AsignacionesService) {}

  @Get('mine')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  getMine(@Req() req: any) {
    return this.asignacionesService.getPuntosDeGestor(req.user.userId);
  }

  @Get('all')
  @Roles(Role.ADMIN)
  getAll() {
    return this.asignacionesService.getMapaCompleto();
  }

  @Get('sin-asignar')
  @Roles(Role.ADMIN)
  getSinAsignar() {
    return this.asignacionesService.getSinAsignar();
  }

  @Patch('punto')
  @Roles(Role.ADMIN)
  reasignar(@Req() req: any, @Body() body: { puntoResiduoId: string; gestorId: string | null }) {
    return this.asignacionesService.reasignarPunto(body.puntoResiduoId, body.gestorId, req.user.userId);
  }
}
