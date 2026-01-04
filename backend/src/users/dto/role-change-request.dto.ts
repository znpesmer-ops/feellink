import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class RoleChangeRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'İstenen rol belirtilmelidir' })
  @IsIn(['art_lover', 'corporate', 'collector', 'artist'], {
    message: 'Geçersiz rol seçildi',
  })
  requestedRole: string;

  @IsString()
  @IsOptional()
  message?: string;
}






