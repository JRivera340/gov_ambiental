import { Body, Controller, Post, Res } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { getEnv } from '../config/env';

// PLAN-MAESTRO.md HITO 0 — mecanismo interino de handoff: el hub emite el JWT
// de siempre y lo manda por POST (body, no query param) desde un form
// auto-submit en el sidebar. Este endpoint solo valida la firma/expiración
// contra el mismo JWT_SECRET que ya comparte con el hub y reenvía el token al
// frontend por fragmento de URL (#token=), que tampoco llega nunca al
// servidor. Ninguno de los dos saltos deja el JWT en logs de acceso/Referer.
//
// Esto NO es el mecanismo objetivo (código de un solo uso canjeado
// servidor-servidor) — ver PLAN-MAESTRO.md, Decisiones abiertas. Migrar
// cuando se autorice tocar auth del hub.
@Controller('handoff')
export class HandoffController {
  constructor(private readonly jwtService: JwtService) {}

  @Post()
  handoff(@Body('token') token: string | undefined, @Res() res: Response) {
    const env = getEnv();
    const frontendUrl = env.FRONTEND_URL.replace(/\/$/, '');

    if (!token) {
      return res.redirect(302, `${frontendUrl}/handoff?error=missing_token`);
    }

    try {
      this.jwtService.verify(token, { secret: env.JWT_SECRET });
    } catch {
      return res.redirect(302, `${frontendUrl}/handoff?error=invalid_token`);
    }

    return res.redirect(302, `${frontendUrl}/handoff#token=${encodeURIComponent(token)}`);
  }
}
