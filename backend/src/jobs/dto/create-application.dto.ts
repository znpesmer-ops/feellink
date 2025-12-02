import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

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
  cvUrl?: string;
}












