import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '../common/enums/role.enum';
import { PuntosService } from './puntos.service';
import { CreatePuntoDto } from './dto/create-punto.dto';
import { UpdatePuntoDto } from './dto/update-punto.dto';
import { SeguimientoDto } from './dto/seguimiento.dto';
import { MergeResiduosDto } from './dto/merge-residuos.dto';
import { AprobarResiduoDto } from './dto/aprobar-residuo.dto';
import { ReporteService } from '../reporte/reporte.service';
import { getEnv } from '../config/env';

@Controller('puntos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PuntosController {
  constructor(private readonly puntosService: PuntosService, private readonly reporteService: ReporteService) {}

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

  @Get()
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  findAll(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.puntosService.findAll({ desde, hasta });
  }

  @Get('pending')
  @Roles(Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  findPending() {
    return this.puntosService.findPending();
  }

  @Get('public/:id')
  @Public()
  findOnePublic(@Param('id') id: string) {
    return this.puntosService.findOnePublic(id);
  }

  @Get('report-xlsx')
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  async reportXlsx(@Res() res: any, @Query('frontendUrl') frontendUrl?: string) {
    const puntos = await this.puntosService.findPublished();
    const buffer = this.reporteService.generateXlsxReport(puntos, frontendUrl || getEnv().FRONTEND_URL);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="pendientes-recogida.xlsx"',
    });
    res.send(buffer);
  }

  @Get(':id')
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.puntosService.findOne(id);
  }

  // El acoplado (hub) siempre dejó editar a GESTOR/VALIDADOR/ADMIN — acá
  // solo se había habilitado GESTOR + ADMIN, dejando al validador sin poder
  // corregir nada (paridad rota con el módulo viejo).
  @Patch(':id')
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdatePuntoDto) {
    const puedeCualquiera = req.user.role === Role.ADMIN || req.user.role === Role.VALIDADOR_AMBIENTAL;
    return this.puntosService.update(id, req.user.userId, dto, puedeCualquiera);
  }

  @Post(':id/send')
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  send(@Req() req: any, @Param('id') id: string) {
    const puedeCualquiera = req.user.role === Role.ADMIN || req.user.role === Role.VALIDADOR_AMBIENTAL;
    return this.puntosService.send(id, req.user.userId, puedeCualquiera);
  }

  // Solo ADMIN — borrado real de un punto (y su asignación). No existía
  // ningún endpoint de borrado individual en este backend.
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.puntosService.remove(id);
  }

  @Post(':id/approve')
  @Roles(Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  approve(@Req() req: any, @Param('id') id: string) {
    return this.puntosService.approve(id, req.user.userId);
  }

  @Post(':id/reject')
  @Roles(Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  reject(@Req() req: any, @Param('id') id: string, @Body() body: { notes: string }) {
    return this.puntosService.reject(id, req.user.userId, body.notes);
  }

  @Patch(':id/seguimiento')
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  seguimiento(@Req() req: any, @Param('id') id: string, @Body() body: SeguimientoDto) {
    return this.puntosService.seguimiento(req.user.userId, req.user.email, id, body);
  }

  @Post(':id/residuo-nota')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  agregarNota(@Req() req: any, @Param('id') id: string, @Body() body: { residuoId: string; texto: string }) {
    return this.puntosService.agregarNota(req.user.userId, req.user.email, id, body);
  }

  @Delete(':id/residuo-nota')
  @Roles(Role.GESTOR_AMBIENTAL, Role.ADMIN)
  eliminarNota(@Param('id') id: string, @Body() body: { residuoId: string; notaId: string }) {
    return this.puntosService.eliminarNota(id, body);
  }

  @Post('merge')
  @Roles(Role.ADMIN, Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL)
  merge(@Body() body: MergeResiduosDto) {
    return this.puntosService.mergeResiduos(body.parentId, body.childIds);
  }

  @Patch(':id/aprobar-residuo')
  @Roles(Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  aprobarResiduo(@Param('id') id: string, @Body() body: AprobarResiduoDto) {
    return this.puntosService.aprobarResiduo(id, body.residuos as any);
  }
}
