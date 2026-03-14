import { IsEmail } from 'class-validator';

export class SendSignupOtpDto {
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi girin.' })
  email: string;
}
