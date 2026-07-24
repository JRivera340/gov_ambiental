import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { PuntosService } from './puntos.service';
import { CreatePuntoDto } from './dto/create-punto.dto';

@Controller('puntos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PuntosController {
  constructor(private readonly puntosService: PuntosService) {}

  @Post()
  @Roles(Role.GESTOR_AMBIENTAL)
  create(@Req() req: any, @Body() dto: CreatePuntoDto) {
    return this.puntosService.create(req.user.userId, dto);
  }

  @Get('mine')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  findMine(@Req() req: any) {
    return this.puntosService.findMine(req.user.userId);
  }
}
