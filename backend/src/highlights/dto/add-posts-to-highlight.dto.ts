import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class AddPostsToHighlightDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  postIds: string[];
}

