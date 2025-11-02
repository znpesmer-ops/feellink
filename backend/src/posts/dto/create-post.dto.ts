import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ required: false, description: 'Post caption with hashtags' })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiProperty({ 
    type: [Object],
    required: false,
    description: 'Media array with url and type',
    example: [{ url: 'http://...', type: 'image', order: 0 }]
  })
  @IsArray()
  @IsOptional()
  media?: Array<{ url: string; type: string; order: number }>;

  @ApiProperty({ required: false, description: 'Location where post was created' })
  @IsString()
  @IsOptional()
  location?: string;
}




