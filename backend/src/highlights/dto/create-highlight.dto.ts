import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

export class CreateHighlightDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  coverPostId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  postIds: string[];
}




