import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateHighlightDto {
  @IsString()
  @IsNotEmpty()
  title: string;
}

