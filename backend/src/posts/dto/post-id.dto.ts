import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PostIdDto {
  @ApiProperty({ description: 'Post ID' })
  @IsString()
  id!: string;
}





