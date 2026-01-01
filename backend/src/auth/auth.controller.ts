import { Controller, Post, Body, Get, UseGuards, Res, Req, UnauthorizedException, Logger } from '@nestjs/common';
import { Response, Request } from 'express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SetRoleDto } from './dto/role.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  
  constructor(private authService: AuthService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle(5, 60) // 🔒 Güvenlik: 1 dakikada maksimum 5 kayıt denemesi (brute force koruması)
  async register(@Body() registerDto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Debug: Gelen raw request body'yi logla
    this.logger.log(`Register RAW request body: ${JSON.stringify(req.body, null, 2)}`);
    this.logger.log(`Register DTO (after validation): ${JSON.stringify(registerDto, null, 2)}`);
    
    const result = await this.authService.register(registerDto);
    
    // Set refreshToken as HTTP-only cookie if registration includes auto-login
    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: false, // LOCAL DEVELOPMENT - set to true in production with HTTPS
        sameSite: 'lax', // Works with mobile browsers
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }
    
    return result;
  }

  @Post('register-corporate')
  @UseGuards(ThrottlerGuard)
  @Throttle(5, 60) // 🔒 Güvenlik: 1 dakikada maksimum 5 kayıt denemesi
  async registerCorporate(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register({ ...registerDto, role: 'corporate' });
    
    // Set refreshToken as HTTP-only cookie if registration includes auto-login
    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: false, // LOCAL DEVELOPMENT - set to true in production with HTTPS
        sameSite: 'lax', // Works with mobile browsers
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }
    
    return result;
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle(5, 60) // 🔒 Güvenlik: 1 dakikada maksimum 5 login denemesi (brute force koruması)
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    try {
      this.logger.log('LOGIN HIT - /auth/login endpoint called');
      this.logger.log(`Login DTO: ${JSON.stringify({ 
        emailOrUsername: loginDto.emailOrUsername ? '***' : undefined,
        email: loginDto.email ? '***' : undefined,
        username: loginDto.username ? '***' : undefined,
        hasPassword: !!loginDto.password 
      })}`);
      
      const result = await this.authService.login(loginDto);
      
      this.logger.log('Login successful');
      
      // Set refreshToken as HTTP-only cookie for mobile compatibility
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: false, // LOCAL DEVELOPMENT - set to true in production with HTTPS
        sameSite: 'lax', // Works with mobile browsers
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
      
      return result;
    } catch (error: any) {
      this.logger.error(`Login error: ${error.message}`, error.stack);
      
      // MongoDB connection timeout hatası
      if (error.message?.includes('timeout') || error.message?.includes('Connection pool')) {
        this.logger.error('MongoDB connection timeout during login');
        throw new UnauthorizedException('Veritabanı bağlantı hatası. Lütfen tekrar deneyin.');
      }
      
      // Diğer hataları yeniden fırlat
      throw error;
    }
  }

  @Post('login-corporate')
  @UseGuards(ThrottlerGuard)
  @Throttle(5, 60) // 🔒 Güvenlik: 1 dakikada maksimum 5 login denemesi
  async corporateLogin(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.corporateLogin(loginDto);
    
    // Set refreshToken as HTTP-only cookie for mobile compatibility
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: false, // LOCAL DEVELOPMENT - set to true in production with HTTPS
      sameSite: 'lax', // Works with mobile browsers
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    
    return result;
  }

  @Post('login-unified')
  @UseGuards(ThrottlerGuard)
  @Throttle(5, 60) // 🔒 Güvenlik: 1 dakikada maksimum 5 login denemesi
  async loginUnified(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    this.logger.log('LOGIN HIT - loginUnified endpoint called');
    const result = await this.authService.loginUnified(loginDto);
    
    // Set refreshToken as HTTP-only cookie for mobile compatibility
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: false, // LOCAL DEVELOPMENT - set to true in production with HTTPS
      sameSite: 'lax', // Works with mobile browsers
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
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

  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  @Throttle(3, 60) // 🔒 Güvenlik: 1 dakikada maksimum 3 şifre sıfırlama talebi (abuse önleme)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    this.logger.log(`🔐 [PASSWORD CHANGE] Password change request received for user: ${user.id} (${user.email || 'no email'})`);
    
    // Request bilgilerini service'e ilet (IP, User-Agent için)
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = req.ip || req.socket.remoteAddress || (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || 'unknown';
    const result = await this.authService.changePassword(user.id, dto, {
      ip: ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    });
    
    this.logger.log(`✅ [PASSWORD CHANGE] Password change completed for user: ${user.id}`);
    
    return result;
  }
}

