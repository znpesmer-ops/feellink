import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

const PLAN_CODES = ['FREE', 'PRO', 'ORI'] as const;

export class UpdateRoleSelectionDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roles?: string[];

  @IsOptional()
  @IsIn(PLAN_CODES)
  plan?: (typeof PLAN_CODES)[number];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  extras?: string[];
}

