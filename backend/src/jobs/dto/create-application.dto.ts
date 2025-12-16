import { IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

export class CreateJobApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  coverLetter?: string;

  @IsOptional()
  @IsUrl()
  portfolioUrl?: string;

  @IsOptional()
  @IsUrl()
  portfolioFileUrl?: string; // Yüklenen portfolyo dosyası URL'i

  @IsOptional()
  @IsString()
  cvUrl?: string;
}



























