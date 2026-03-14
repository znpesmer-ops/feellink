import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OtpService } from './otp.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AccountStatusGuard } from './guards/account-status.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchModule } from '../search/search.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const jwtSecret = configService.get('JWT_SECRET') || 'default-secret-change-in-production';
        if (!configService.get('JWT_SECRET')) {
          console.warn('⚠️ JWT_SECRET not set, using default secret. This is insecure for production!');
        }
        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: '15m', // Access token expires in 15 minutes
          },
        };
      },
      inject: [ConfigService],
    }),
    PrismaModule,
    SearchModule,
    MailModule,
  ],
  providers: [AuthService, OtpService, JwtStrategy, AccountStatusGuard],
  controllers: [AuthController],
  exports: [AuthService, AccountStatusGuard],
})
export class AuthModule {}

