import { Controller, Post, Body, Get, UseGuards, Res, Req, UnauthorizedException, Logger } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SetRoleDto } from './dto/role.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendSignupOtpDto } from './dto/send-signup-otp.dto';
import { VerifySignupOtpDto } from './dto/verify-signup-otp.dto';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto';
import { ResetPasswordWithOtpDto } from './dto/reset-password-with-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Debug: Gelen raw request body'yi logla
    this.logger.log(`Register RAW request body: ${JSON.stringify(req.body, null, 2)}`);
    this.logger.log(`Register DTO (after validation): ${JSON.stringify(registerDto, null, 2)}`);
    
    const result = await this.authService.register(registerDto);
    // OTP akışında token dönülmez; cookie sadece verify-signup-otp sonrası set edilir
    if ('refreshToken' in result && result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }
    return result;
  }

  @Post('register-corporate')
  async registerCorporate(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register({ ...registerDto, role: 'corporate' });
    if ('refreshToken' in result && result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }
    return result;
  }

  @Get('db-check')
  async dbCheck() {
    const ok = await this.authService.checkDatabase();
    return { ok };
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);
    if ((result as any).status !== 'DELETED_ACCOUNT' && (result as any).refreshToken) {
      res.cookie('refreshToken', (result as any).refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }
    return result;
  }

  @Post('login-corporate')
  async corporateLogin(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.corporateLogin(loginDto);
    if ((result as any).status !== 'DELETED_ACCOUNT' && (result as any).refreshToken) {
      res.cookie('refreshToken', (result as any).refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }
    return result;
  }

  @Post('login-unified')
  async loginUnified(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginUnified(loginDto);
    if ((result as any).status !== 'DELETED_ACCOUNT' && (result as any).refreshToken) {
      res.cookie('refreshToken', (result as any).refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }
    return result;
  }

  @Post('restore-account')
  async restoreAccount(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.restoreAccount(loginDto);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return result;
  }

  @Post('role')
  async setRole(@Body() setRoleDto: SetRoleDto) {
    return this.authService.setUserRole(setRoleDto.userId, setRoleDto.role);
  }

  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Try to get refreshToken from cookie first, then from body
    const refreshToken = req.cookies?.refreshToken || refreshDto.refreshToken;
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }
    
    const result = await this.authService.refreshTokens(refreshToken);
    
    // Set new refreshToken as HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: false, // LOCAL DEVELOPMENT - set to true in production with HTTPS
      sameSite: 'lax', // Works with mobile browsers
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    
    return result;
  }

  @Post('logout')
  async logout(@Body() refreshDto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Try to get refreshToken from cookie first, then from body
    const refreshToken = req.cookies?.refreshToken || refreshDto.refreshToken;
    
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    
    // Clear refreshToken cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });
    
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@CurrentUser() user: any) {
    return this.authService.logoutAll(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: any) {
    return this.authService.getUserProfile(user.id);
  }

  @Post('send-signup-otp')
  async sendSignupOtp(@Body() dto: SendSignupOtpDto) {
    return this.authService.sendSignupOtp(dto.email);
  }

  @Post('verify-signup-otp')
  async verifySignupOtp(@Body() dto: VerifySignupOtpDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verifySignupOtp(dto.email, dto.code);
    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }
    return result;
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('verify-reset-otp')
  async verifyResetOtp(@Body() dto: VerifyResetOtpDto) {
    return this.authService.verifyResetOtp(dto.email, dto.code);
  }

  @Post('reset-password-with-otp')
  async resetPasswordWithOtp(@Body() dto: ResetPasswordWithOtpDto) {
    return this.authService.resetPasswordWithOtp(dto.resetToken, dto.newPassword);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}

