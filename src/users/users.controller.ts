import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('gestores/list')
  findGestores(@Req() req: any) {
    return this.usersService.findGestores(req.user.role, extractBearerToken(req));
  }

  @Get(':id')
  @Roles(Role.GESTOR_AMBIENTAL, Role.VALIDADOR_AMBIENTAL, Role.ADMIN)
  findById(@Req() req: any, @Param('id') id: string) {
    return this.usersService.findById(id, extractBearerToken(req));
  }
}

function extractBearerToken(req: any): string {
  const header: string = req.headers?.authorization ?? '';
  return header.replace(/^Bearer\s+/i, '');
}
