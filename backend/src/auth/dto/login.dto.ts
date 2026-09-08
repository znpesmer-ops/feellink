import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @ValidateIf((o) => !o.email && !o.username && !o.identifier)
  @IsString()
  emailOrUsername?: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}














