import { IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordWithOtpDto {
  @IsString()
  resetToken: string;

  @IsString()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Şifre en az bir harf ve bir rakam içermelidir.',
  })
  newPassword: string;
}
