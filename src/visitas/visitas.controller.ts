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

  // Historial de quincenas cerradas con el cumplimiento real. El gestor ve el
  // suyo; el admin consulta el de cualquiera pasando gestorId.
  @Get('historial')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  getHistorial(@Req() req: any, @Query('gestorId') gestorId?: string, @Query('limit') limit?: string) {
    const esAdmin = req.user.role === Role.ADMIN;
    const objetivo = esAdmin && gestorId ? gestorId : req.user.userId;
    const limite = limit ? Number(limit) : 20;
    return this.visitasService.getHistorialConVisitas(objetivo, Number.isFinite(limite) ? limite : 20);
  }

  // Plan del ciclo + puntos ya visitados en cada semana. Fuente única de
  // "visitado" para la ruta y el perfil del gestor.
  @Get('plan')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  getPlan(@Req() req: any) {
    return this.visitasService.getPlanConVisitas(req.user.userId);
  }
}
