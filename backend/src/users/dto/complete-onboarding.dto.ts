import { IsDateString, IsString, IsIn, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CompleteOnboardingDto {
  @IsNotEmpty({ message: 'Doğum tarihi gereklidir' })
  @IsDateString({}, { message: 'Geçerli bir tarih girin' })
  dateOfBirth: string;

  @IsNotEmpty({ message: 'Ülke gereklidir' })
  @IsString()
  country: string;

  @IsNotEmpty({ message: 'Şehir gereklidir' })
  @IsString()
  city: string;

  @IsNotEmpty({ message: 'Cinsiyet seçimi gereklidir' })
  @IsIn(['FEMALE', 'MALE', 'UNSPECIFIED'], {
    message: 'Geçerli bir cinsiyet seçeneği seçin',
  })
  gender: string;

  @IsNotEmpty({ message: 'GDPR onayı gereklidir' })
  @IsBoolean({ message: 'GDPR onayı boolean olmalıdır' })
  gdprConsent: boolean;

  @IsOptional()
  @IsBoolean()
  analyticsConsent?: boolean;
}


