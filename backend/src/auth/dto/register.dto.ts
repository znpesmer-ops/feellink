import { UserRoleCode } from '../../roles/roles.types';
import { IsNotEmpty, IsOptional, IsString, MinLength, Matches, IsBoolean, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsEmail({}, { message: 'Lütfen geçerli bir e-posta adresi girin.' })
  @IsNotEmpty({ message: 'E-posta adresi gereklidir' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Kullanıcı adı gereklidir' })
  @MinLength(3, { message: 'Kullanıcı adı en az 3 karakter olmalıdır' })
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
  @Transform(({ value }) => {
    // Boş string'i undefined'a çevir
    if (typeof value === 'string' && value.trim() === '') {
      return undefined;
    }
    return value;
  })
  fullName?: string;

  @IsOptional()
  @IsString()
  role?: UserRoleCode;

  @IsBoolean({ message: 'Kullanıcı sözleşmesi kabul edilmelidir' })
  @IsNotEmpty({ message: 'Kullanıcı sözleşmesi kabul edilmelidir' })
  termsAccepted: boolean;
}











