import { Controller, Delete, Get, Param, Req, UseGuards, HttpException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { getEnv } from '../config/env';

// Ambiental no tiene tabla de usuarios propia — la identidad viene del hub
// (JWT compartido, ver jwt.strategy.ts). Para "listar gestores" (necesario
// para asignar puntos y para los paneles de admin) y para resolver el
// nombre de quien creó un punto, este controller reenvía la petición al hub
// server-to-server, sin CORS de por medio, pasando el mismo token del
// usuario que llamó (el hub valida la firma con el mismo JWT_SECRET, no le
// importa qué servicio hizo la llamada).
@Controller('users')
export class UsersProxyController {
  private async proxyToHub(path: string, authHeader?: string, method: string = 'GET') {
    const env = getEnv();
    try {
      const res = await fetch(`${env.HUB_API_URL}/api/users/${path}`, {
        method,
        headers: authHeader ? { Authorization: authHeader } : {},
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new HttpException(body || 'Error consultando el hub', res.status);
      }
      return body;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException('No se pudo contactar al hub de usuarios', 502);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('gestores/list')
  async getGestores(@Req() req: any) {
    return this.proxyToHub('gestores/list', req.headers['authorization']);
  }

  // Usado para resolver el nombre de quien creó/aprobó un punto (paneles de
  // validador y admin) — este backend solo guarda el userId, no el nombre.
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUserById(@Param('id') id: string, @Req() req: any) {
    return this.proxyToHub(id, req.headers['authorization']);
  }

  // Borrar una cuenta de gestor inactiva (sin puntos asignados, cuentas de
  // prueba, etc). Solo ADMIN — el hub también exige ADMIN del lado suyo,
  // esto es una segunda capa antes de siquiera llamarlo.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  async deleteUser(@Param('id') id: string, @Req() req: any) {
    return this.proxyToHub(id, req.headers['authorization'], 'DELETE');
  }
}
