import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RutasSemanalesService } from './rutas-semanales.service';
import type { ParadaLite } from './lib/paradas.types';

@Controller('rutas-semanales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RutasSemanalesController {
  constructor(private readonly rutasService: RutasSemanalesService) {}

  @Get('mine')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  getMine(@Req() req: any) {
    return this.rutasService.getRutaDeLaQuincena(req.user.userId);
  }

  @Get('arrastre/mine')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  getArrastre(@Req() req: any) {
    return this.rutasService.getArrastrePendiente(req.user.userId);
  }

  // Historial de rutas de quincenas cerradas. El gestor solo ve el suyo; el
  // admin consulta el de cualquiera pasando gestorId.
  @Get('historial')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  getHistorial(@Req() req: any, @Query('gestorId') gestorId?: string, @Query('limit') limit?: string) {
    const esAdmin = req.user.role === Role.ADMIN;
    const objetivo = esAdmin && gestorId ? gestorId : req.user.userId;
    const limite = limit ? Number(limit) : 20;
    return this.rutasService.getHistorial(objetivo, Number.isFinite(limite) ? limite : 20);
  }

  // Plan de la quincena, sin el cruce con las visitas: ese vive en
  // GET /visitas/plan, porque VisitasService ya depende de este módulo y
  // pedirle la dependencia inversa cerraría un ciclo en Nest.
  @Get('plan')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  getPlan(@Req() req: any) {
    return this.rutasService.getPlanQuincena(req.user.userId);
  }

  @Post()
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  crear(@Req() req: any, @Body() body: { paradas: ParadaLite[]; segmentos: unknown[] }) {
    return this.rutasService.crearRutaQuincena({
      gestorId: req.user.userId,
      paradas: body.paradas,
      segmentos: body.segmentos,
    });
  }

  @Patch(':id/cancelar')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  cancelar(@Req() req: any, @Param('id') id: string) {
    return this.rutasService.cancelarRuta(id, req.user.userId, req.user.role === Role.ADMIN);
  }
}
