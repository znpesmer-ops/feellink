import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

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

  @IsNotEmpty()
  @IsString()
  password: string;
}














