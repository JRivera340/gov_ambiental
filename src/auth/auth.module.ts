import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { HandoffController } from './handoff.controller';
import { getEnv } from '../config/env';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({ secret: getEnv().JWT_SECRET }),
  ],
  controllers: [HandoffController],
  providers: [JwtStrategy],
  exports: [PassportModule],
})
export class AuthModule {}
