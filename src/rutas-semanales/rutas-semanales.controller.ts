import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
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
    return this.rutasService.getRutaDeLaSemana(req.user.userId);
  }

  @Get('arrastre/mine')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  getArrastre(@Req() req: any) {
    return this.rutasService.getArrastrePendiente(req.user.userId);
  }

  @Post()
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  crear(@Req() req: any, @Body() body: { paradas: ParadaLite[]; segmentos: unknown[] }) {
    return this.rutasService.crearRutaSemana({ gestorId: req.user.userId, paradas: body.paradas, segmentos: body.segmentos });
  }

  @Patch(':id/cancelar')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  cancelar(@Req() req: any, @Param('id') id: string) {
    return this.rutasService.cancelarRuta(id, req.user.userId, req.user.role === Role.ADMIN);
  }
}
