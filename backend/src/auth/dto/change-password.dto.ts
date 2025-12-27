import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Mevcut şifre gereklidir.' })
  @IsString()
  currentPassword: string;

  @IsNotEmpty({ message: 'Yeni şifre gereklidir.' })
  @IsString()
  @MinLength(8, { message: 'Yeni şifre en az 8 karakter olmalıdır.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Yeni şifre en az bir harf ve bir rakam içermelidir.',
  })
  newPassword: string;
}

