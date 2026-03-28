import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsIn, IsDateString } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ required: false, description: 'Post caption with hashtags' })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiProperty({ required: false, description: 'Artwork title (eser adı)' })
  @IsString()
  @IsOptional()
  title?: string;

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

  @ApiProperty({ 
    required: false, 
    description: 'Post type: post or artwork',
    enum: ['post', 'artwork'],
    default: 'post'
  })
  @IsString()
  @IsOptional()
  @IsIn(['post', 'artwork'])
  type?: string;

  // 🎨 Frontend'den gelen renkler
  @ApiProperty({ 
    required: false, 
    description: 'Color palette extracted from image (hex color codes)',
    type: [String],
    example: ['#ffaa00', '#223344', '#556677']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colorPalette?: string[];

  @ApiProperty({ required: false, description: 'Eserin oluşturulduğu tarih (ISO date string, opsiyonel)' })
  @IsOptional()
  @IsDateString()
  artworkCreatedDate?: string;
}




















