import { IsString, IsOptional, IsUrl, IsBoolean, ValidateIf, IsDateString, IsIn } from 'class-validator';

export class UpdateUserDto {
  // 🔒 KRİTİK: Username kaldırıldı - profil URL'ini korumak için
  // Username değişikliği ayrı bir endpoint'te yapılmalı (gelecekte)
  // @IsOptional()
  // @IsString()
  // username?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @ValidateIf((o) => o.website !== null && o.website !== undefined && o.website !== '')
  @IsUrl({}, { message: 'Geçerli bir URL adresi girin' })
  website?: string | null;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Geçerli bir tarih girin' })
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsIn(['FEMALE', 'MALE', 'UNSPECIFIED'], {
    message: 'Geçerli bir cinsiyet seçeneği seçin',
  })
  gender?: string;

  @IsOptional()
  @IsBoolean()
  showProfileColorSignature?: boolean; // 🎨 Profil renk imzasını göster/gizle
}

