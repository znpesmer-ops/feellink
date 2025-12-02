import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  plan: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  extras?: string[];
}


















