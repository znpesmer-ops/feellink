import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateJobDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  salary?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  saveAsDraft?: boolean;

  @IsOptional()
  @IsString()
  deadline?: string;

  @IsOptional()
  @IsString()
  maxApplications?: string;

  @IsOptional()
  @IsBoolean()
  autoCloseOnDeadline?: boolean;
}
































