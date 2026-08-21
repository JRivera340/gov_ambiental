import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { VisitasService } from './visitas.service';

@Controller('visitas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisitasController {
  constructor(private readonly visitasService: VisitasService) {}

  // Dashboard admin: visitas por gestor + % de cumplimiento semanal.
  // gestorId es opcional — sin filtro trae todos los que tengan asignaciones.
  @Get('desempeno')
  @Roles(Role.ADMIN)
  getDesempeno(@Query('gestorId') gestorId?: string) {
    return this.visitasService.getResumenDesempeno(gestorId);
  }

  // Autoconsulta del propio gestor.
  @Get('mine')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  getMine(@Req() req: any) {
    return this.visitasService.getResumenDesempeno(req.user.userId);
  }

  // Plan del ciclo + puntos ya visitados en cada semana. Fuente única de
  // "visitado" para la ruta y el perfil del gestor.
  @Get('plan')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  getPlan(@Req() req: any) {
    return this.visitasService.getPlanConVisitas(req.user.userId);
  }
}
