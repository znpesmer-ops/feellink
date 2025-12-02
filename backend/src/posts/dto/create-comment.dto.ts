import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'Comment content' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ required: false, description: 'Parent comment ID for nested comments' })
  @IsString()
  @IsOptional()
  parentId?: string;
}



























