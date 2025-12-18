import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

export class CreateHighlightDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  coverPostId: string; // 🔥 KRİTİK: Artık zorunlu (Instagram mantığı)

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  postIds: string[];
}



















