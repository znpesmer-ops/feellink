import { UserRoleCode } from '../../roles/roles.types';
import { IsNotEmpty, IsOptional, IsString, MinLength, MaxLength, Matches, IsBoolean, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsEmail({}, { message: 'Lütfen geçerli bir e-posta adresi girin.' })
  @IsNotEmpty({ message: 'E-posta adresi gereklidir' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Kullanıcı adı gereklidir' })
  @MinLength(3, { message: 'Kullanıcı adı en az 3 karakter olmalıdır' })
  @MaxLength(30, { message: 'Kullanıcı adı en fazla 30 karakter olabilir' })
  @Matches(/^(?![._])(?!.*[._]{2})(?!.*[._]$)[a-z0-9._]+$/, {
    message: 'Kullanıcı adı sadece küçük harf, rakam, nokta ve alt çizgi içerebilir; nokta veya alt çizgi ile başlayıp bitemez.',
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Şifre gereklidir' })
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Şifre en az bir harf ve bir rakam içermelidir',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(70, { message: 'Profil adı en fazla 70 karakter olabilir' })
  @Transform(({ value }) => {
    // Boş string'i undefined'a çevir
    if (typeof value === 'string' && value.trim() === '') {
      return undefined;
    }
    return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value;
  })
  fullName?: string;

  @IsOptional()
  @IsString()
  role?: UserRoleCode;

  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === 1 || value === '1' || value === 'on') return true;
    if (value === false || value === 'false' || value === 0 || value === '0' || value === '' || value == null) return false;
    return value;
  })
  @IsBoolean({ message: 'Kullanıcı sözleşmesi kabul edilmelidir' })
  @IsNotEmpty({ message: 'Kullanıcı sözleşmesi kabul edilmelidir' })
  termsAccepted: boolean;
}










