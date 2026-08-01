import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { getEnv } from '../config/env';

// Login propio: este módulo emite y verifica su propio JWT, sin depender de
// ningún sistema externo. AuthController/AuthService autentican contra la
// tabla `users` (ver users.module.ts); JwtStrategy sigue siendo stateless.
@Module({
  imports: [
    PassportModule,
    UsersModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const env = getEnv();
        return { secret: env.JWT_SECRET, signOptions: { expiresIn: '8h' } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, AuthService],
  exports: [PassportModule],
})
export class AuthModule {}
