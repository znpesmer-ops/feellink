import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class SetRoleDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  @IsIn([
    'USER',
    'CORPORATE',
    'COLLECTOR',
    'MUSEUM',
    'ARTIST',
    'ART_LOVER',
    'user',
    'corporate',
    'collector',
    'museum',
    'artist',
    'art_lover',
  ])
  role:
    | 'USER'
    | 'CORPORATE'
    | 'COLLECTOR'
    | 'MUSEUM'
    | 'ARTIST'
    | 'ART_LOVER'
    | 'user'
    | 'corporate'
    | 'collector'
    | 'museum'
    | 'artist'
    | 'art_lover';
}


