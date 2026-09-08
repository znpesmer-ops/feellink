import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUsernameDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Kullanıcı adı en az 3 karakter olmalıdır.' })
  @MaxLength(30, { message: 'Kullanıcı adı en fazla 30 karakter olabilir.' })
  @Matches(/^(?![._])(?!.*[._]{2})(?!.*[._]$)[a-z0-9._]+$/, {
    message: 'Kullanıcı adı sadece küçük harf, rakam, nokta ve alt çizgi içerebilir; nokta veya alt çizgi ile başlayıp bitemez.',
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  username: string;
}
