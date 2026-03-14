import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class VerifyResetOtpDto {
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi girin.' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'Kod 6 haneli olmalıdır.' })
  @Matches(/^\d{6}$/, { message: 'Kod sadece rakamlardan oluşmalıdır.' })
  code: string;
}
