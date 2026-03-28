import { IsArray, IsOptional, IsString, ArrayMaxSize } from 'class-validator';

const MAX_ORDER_LEN = 500;

export class UpdateProfileGridOrderDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ORDER_LEN)
  @IsString({ each: true })
  postOrder?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ORDER_LEN)
  @IsString({ each: true })
  artworkOrder?: string[];
}
