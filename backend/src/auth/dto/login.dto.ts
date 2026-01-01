import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateIf, MinLength } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @ValidateIf((o) => !o.email && !o.username)
  @IsString()
  emailOrUsername?: string;

  @IsNotEmpty({ message: 'Şifre gereklidir' })
  @IsString({ message: 'Şifre string olmalıdır' })
  @MinLength(1, { message: 'Şifre boş olamaz' }) // 🔒 Güvenlik: En azından boş string kontrolü
  password: string;
}














