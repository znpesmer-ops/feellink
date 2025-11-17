import { UserRoleCode } from '../../roles/roles.types';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { IsUnicodeEmail } from '../../common/validators/is-unicode-email.decorator';

export class RegisterDto {
  @IsUnicodeEmail({ message: 'Lütfen geçerli bir e-posta adresi girin.' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  role?: UserRoleCode;
}











