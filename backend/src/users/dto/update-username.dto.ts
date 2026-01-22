import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateUsernameDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Kullanıcı adı en az 3 karakter olmalıdır.' })
  @MaxLength(30, { message: 'Kullanıcı adı en fazla 30 karakter olabilir.' })
  @Matches(/^[a-z0-9._]+$/, {
    message: 'Kullanıcı adı sadece küçük harf, rakam, nokta ve alt çizgi içerebilir.',
  })
  username: string;
}
