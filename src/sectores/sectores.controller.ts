import { Body, Controller, Get, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { SectoresService } from './sectores.service';

@Controller('sectores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SectoresController {
  constructor(private readonly sectoresService: SectoresService) {}

  @Get('puntos')
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  getPuntos(
    @Query('sectorId') sectorId: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('status') status?: string,
    @Query('sectorBarrio') sectorBarrio?: string,
  ) {
    return this.sectoresService.getPuntosEnSector(sectorId, desde, hasta, status, sectorBarrio);
  }

  @Patch('marcar-recogido-masivo')
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  marcarRecogido(
    @Req() req: any,
    @Body() body: { sectorId: string; fechaRecogida?: string; photosRecogida?: string[]; desde?: string; hasta?: string; sectorBarrio?: string },
  ) {
    return this.sectoresService.marcarSectorComoRecogido(
      body.sectorId, req.user.userId, req.user.email, body.fechaRecogida, body.photosRecogida, body.desde, body.hasta, body.sectorBarrio,
    );
  }
}
