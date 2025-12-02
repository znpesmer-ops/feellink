import { IsString, IsOptional, IsUrl, IsBoolean, ValidateIf } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @ValidateIf((o) => o.website !== null && o.website !== undefined && o.website !== '')
  @IsUrl({}, { message: 'Geçerli bir URL adresi girin' })
  website?: string | null;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

