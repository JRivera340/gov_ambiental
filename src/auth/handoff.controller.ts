import { Body, Controller, Logger, Post, Res } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { getEnv } from '../config/env';

// El hub emite el JWT de siempre y lo manda por POST (body, no query param)
// desde un form auto-submit en su sidebar (ver
// gov-espacio-publico/packages/frontend/src/pages/gestor-ambiental/GestorAmbientalDashboard.tsx,
// goToAmbientalV2). Este endpoint solo valida la firma/expiración contra el
// mismo JWT_SECRET que ya comparte con el hub y reenvía el token al
// frontend por fragmento de URL (#token=), que nunca llega al servidor.
// Ninguno de los dos saltos deja el JWT en logs de acceso/Referer.
//
// Este endpoint solo lo consume una navegación de página completa (el form
// auto-submit del sidebar del hub), nunca un cliente fetch/JSON — por eso
// responde siempre con una redirección 302 (incluso en error), nunca con un
// cuerpo JSON de error: un 400/401 crudo se vería como una página en blanco
// rota para el usuario en medio de la navegación. Errores inesperados sí
// quedan con causa real en el log del servidor (nunca el token) para poder
// diagnosticarlos sin adivinar.
@Controller('handoff')
export class HandoffController {
  private readonly logger = new Logger(HandoffController.name);

  constructor(private readonly jwtService: JwtService) {}

  @Post()
  handoff(@Body('token') token: string | undefined, @Res() res: Response) {
    let frontendUrl: string;
    try {
      const env = getEnv();
      frontendUrl = env.FRONTEND_URL.replace(/\/$/, '');

      if (!token) {
        this.logger.warn('Handoff sin token en el body de la petición');
        return res.redirect(302, `${frontendUrl}/handoff?error=missing_token`);
      }

      try {
        this.jwtService.verify(token, { secret: env.JWT_SECRET });
      } catch (verifyErr) {
        this.logger.warn(`Handoff con token inválido o expirado: ${(verifyErr as Error).message}`);
        return res.redirect(302, `${frontendUrl}/handoff?error=invalid_token`);
      }

      return res.redirect(302, `${frontendUrl}/handoff#token=${encodeURIComponent(token)}`);
    } catch (err) {
      this.logger.error(`Error inesperado en /api/handoff: ${(err as Error).message}`, (err as Error).stack);
      const fallback = (frontendUrl! || 'https://ambiental.bogotaneidapp.com').replace(/\/$/, '');
      return res.redirect(302, `${fallback}/handoff?error=server_error`);
    }
  }
}
