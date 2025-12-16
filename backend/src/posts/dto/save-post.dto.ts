import { IsNotEmpty, IsString } from 'class-validator';

export class SavePostDto {
  @IsNotEmpty()
  @IsString()
  postId: string;
}











































