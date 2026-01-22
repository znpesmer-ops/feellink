'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import { AuthGuard } from '@/lib/auth-guard'
import Cropper from 'react-easy-crop'
import getCroppedImg from '@/utils/cropImage'
import type { Area } from 'react-easy-crop'
import toast from 'react-hot-toast'
import { TR_CITIES } from '@/constants/cities.tr'
import { Lock, BarChart3, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

type Gender = 'FEMALE' | 'MALE' | 'UNSPECIFIED'

interface Country {
  code: string
  name: string
  cities: string[]
}

function EditProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const isRequired = searchParams.get('required') === 'true'
  const { user, accessToken, capabilities, setUser } = useAuthStore()
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')
  const [fullName, setFullName] = useState('')
  const [website, setWebsite] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [country, setCountry] = useState<string | null>(null)
  const [city, setCity] = useState<string | null>(null)
  const [gender, setGender] = useState<'FEMALE' | 'MALE' | 'UNSPECIFIED' | ''>('')
  const [countries, setCountries] = useState<Country[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Crop modal states
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  // Load countries data
  useEffect(() => {
    fetch('/data/countries.json')
      .then((res) => res.json())
      .then((data) => setCountries(data))
      .catch((err) => {
        console.error('Error loading countries:', err)
        toast.error('Ülke listesi yüklenemedi')
      })
  }, [])

  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setBio(user.bio || '')
      setAvatar(user.avatar || '')
      setAvatarPreview(user.avatar || '')
      setFullName(user.fullName || '')
      setWebsite(user.website || '')
      setIsPrivate(user.isPrivate || false)
      // Load profile data from API if available
      const loadProfileData = async () => {
        try {
          const response = await api.get('/users/me')
          const profileData = response.data
          if (profileData.dateOfBirth) {
            const date = new Date(profileData.dateOfBirth)
            setDateOfBirth(date.toISOString().split('T')[0])
          }
          setCountry(profileData.country || null)
          setCity(profileData.city || null)
          setGender((profileData.gender as 'FEMALE' | 'MALE' | 'UNSPECIFIED') || '')
        } catch (error) {
          console.error('Error loading profile data:', error)
        }
      }
      loadProfileData()
    }
  }, [user])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('Lütfen bir resim dosyası seçin. JPG, PNG veya GIF formatında, maksimum 5MB')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Dosya boyutu 5MB\'dan büyük olamaz. JPG, PNG veya GIF formatında, maksimum 5MB')
      return
    }

    setMessage('')

    // Read file and open crop modal
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      setImageSrc(reader.result as string)
      setCropModalOpen(true)
    })
    reader.readAsDataURL(file)
  }

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCropFinish = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    setIsUploading(true)
    setMessage('')

    try {
      // Crop image
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels)

      // Create preview
      const previewUrl = URL.createObjectURL(croppedImageBlob)
      setAvatarPreview(previewUrl)

      // Upload cropped file
      const formData = new FormData()
      formData.append('file', croppedImageBlob, 'profile.jpg')

      const response = await api.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setAvatar(response.data.url)
      setMessage('')
      setCropModalOpen(false)

      // Cleanup
      setImageSrc(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)

      // Cleanup preview URL
      URL.revokeObjectURL(previewUrl)
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Dosya yüklenirken bir hata oluştu')
      setAvatarPreview(user?.avatar || '')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCropCancel = () => {
    setCropModalOpen(false)
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveAvatar = () => {
    setAvatar('')
    setAvatarPreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!accessToken) return

    setIsLoading(true)
    setMessage('')

    try {
      // Convert empty website string to null, or null if isPrivate is true
      const websiteValue = isPrivate || !website || website.trim() === '' ? null : website.trim()

      // 🔒 KRİTİK: Username'i gönderme - profil URL'ini bozmamak için
      // Username sadece özel bir sayfadan (username değiştirme) güncellenebilir
      // ✅ Username değiştiyse önce username endpoint'ini çağır (opsiyonel - başarısız olsa bile devam et)
      if (username && username !== user?.username) {
        try {
          const usernameResponse = await api.patch('/users/me/username', { username }, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          
          // ✅ Backend'den gelen yeni username'i kullan
          if (usernameResponse.data?.username && user) {
            const updatedUser = {
              ...user,
              username: usernameResponse.data.username,
              usernameLastChangedAt: usernameResponse.data.usernameLastChangedAt || null,
            };
            setUser(updatedUser, capabilities ?? null);
            toast.success('Kullanıcı adı başarıyla güncellendi!');
          }
        } catch (usernameError: any) {
          // ⚠️ Username update başarısız olsa bile diğer profil güncellemeleri devam etsin
          console.warn('⚠️ [Username Update] Username güncellenemedi, diğer güncellemeler devam ediyor:', usernameError?.response?.status);
          
          // Sadece 401 (auth) hatası durumunda durdur
          if (usernameError.response?.status === 401) {
            setMessage('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
            toast.error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
            setIsLoading(false);
            return;
          }
          
          // Diğer hatalarda sadece uyarı göster, devam et
          if (usernameError.response?.status === 404) {
            console.warn('⚠️ [Username Update] Endpoint bulunamadı (404) - Backend deploy olmamış olabilir');
            // Sessizce devam et, kullanıcıyı rahatsız etme
          } else if (usernameError.response?.status === 400) {
            // 14 gün limiti gibi validation hataları için uyarı göster
            const errorMsg = usernameError.response.data?.message || 'Kullanıcı adı güncellenemedi';
            toast.error(errorMsg);
          }
          // Diğer hatalarda sessizce devam et
        }
      }

      const response = await api.put(
        '/users/profile',
        {
          bio,
          avatar,
          fullName,
          website: websiteValue,
          isPrivate,
          dateOfBirth: dateOfBirth || undefined,
          country: country ?? undefined,
          city: city ?? undefined,
          gender: gender || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      // 🔒 KRİTİK: User state'ini güncelle - UI'ın eski veriyi göstermesini önle
      if (response.data) {
        // Backend'den gelen updated user'ı kullan
        const updatedUser = { ...user, ...response.data }
        setUser(updatedUser, capabilities ?? null)

        // Zorunlu alanlar doluysa profileCompleted'i true yap
        if (dateOfBirth && country && city && gender) {
          const userWithCompletedProfile = { ...updatedUser, profileCompleted: true }
          setUser(userWithCompletedProfile, capabilities ?? null)
        }
      }
      setMessage('Profil başarıyla güncellendi!')
      toast.success('Profil başarıyla güncellendi!')

      // 🔔 Zorunlu alanlar tamamlandıysa bildirimi sil (backend otomatik silecek, frontend query'i invalidate et)
      if (dateOfBirth && country && city && gender) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      }

      // Zorunlu alanlar tamamlandıysa required query param'ini kaldır
      if (isRequired && dateOfBirth && country && city && gender) {
        router.replace('/profile/edit')
      }

      // 🔒 KRİTİK: Backend'den FRESH username al - case-sensitive sorununu kesin çöz
      // Backend response'unda username varsa onu kullan, yoksa /users/me'den al
      let finalUsername: string | null = null

      if (response.data?.username) {
        // Backend update response'unda username varsa onu kullan
        finalUsername = response.data.username
        console.log('[Profile Edit] Username from update response:', finalUsername)
      } else {
        // Backend'den fresh username al
        try {
          const freshUserResponse = await api.get('/users/me')
          if (freshUserResponse.data?.username) {
            finalUsername = freshUserResponse.data.username
            console.log('[Profile Edit] Username from /users/me:', finalUsername)
            // State'i de güncelle
            setUser(freshUserResponse.data, capabilities ?? null)
          }
        } catch (refreshError) {
          console.warn('Failed to refresh user data for redirect:', refreshError)
        }
      }

      // Fallback: user store'dan username al
      if (!finalUsername) {
        finalUsername = user?.username || null
        console.log('[Profile Edit] Username from store (fallback):', finalUsername)
      }

      // Redirect yap (sadece required değilse)
      if (!isRequired && finalUsername) {
        setTimeout(() => {
          console.log('[Profile Edit] Redirecting to:', `/profile/${finalUsername}`)
          router.push(`/profile/${finalUsername}`)
          router.refresh() // 🔒 Sayfayı yenile - güncel veriyi göster
        }, 1500)
      } else if (isRequired && dateOfBirth && country && city && gender) {
        // Zorunlu alanlar tamamlandı, feed'e yönlendir
        setTimeout(() => {
          router.push('/feed')
          router.refresh()
        }, 1500)
      } else if (!finalUsername) {
        console.error('[Profile Edit] No username found for redirect')
        toast.error('Profil güncellendi ancak yönlendirme yapılamadı')
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  if (!accessToken) {
    return null
  }

  // Zorunlu alanlar kontrolü
  const hasRequiredFields = dateOfBirth && country && city && gender
  const requiredFieldsMissing = !dateOfBirth || !country || !city || !gender

  return (
    <div className="max-w-2xl mx-auto mt-8 px-4">
      <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 p-6 md:p-8 transition-colors">
        <h2 className="text-2xl font-bold text-[#1f1f1f] dark:text-white mb-6">Profili Düzenle</h2>

        {/* Zorunlu Alan Uyarısı (sadece required=true varsa veya zorunlu alanlar eksikse) */}
        {(isRequired || requiredFieldsMissing) && (
          <div className="mb-6 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-200 mb-2">
              Profilini Tamamla
            </h3>
            <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
              {isRequired
                ? 'Feellink\'i tam kullanabilmek için aşağıdaki bilgileri doldurman gerekiyor.'
                : 'Bazı zorunlu bilgiler eksik. Lütfen aşağıdaki alanları doldur.'}
            </p>
            <div className="space-y-1.5 text-xs text-orange-700 dark:text-orange-400">
              <div className="flex items-center gap-2">
                <Lock size={14} />
                <span>Bu bilgiler gizlilik ayarlarına tabidir</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 size={14} />
                <span>Yaş ve şehir yalnızca istatistik ve filtreleme için kullanılır</span>
              </div>
            </div>
          </div>
        )}

        {/* Avatar Upload */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 dark:text-white/70 mb-3">
            Profil Fotoğrafı
          </label>

          {/* Avatar Preview with Change Button */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={avatarPreview || avatar || 'https://via.placeholder.com/96?text=Avatar'}
                alt="Avatar preview"
                className="w-[110px] h-[110px] rounded-full object-cover border border-black/10 dark:border-white/20"
                onError={(e) => {
                  ; (e.target as HTMLImageElement).src = 'https://via.placeholder.com/96?text=Avatar'
                }}
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
                id="avatar-upload"
              />
              <label
                htmlFor="avatar-upload"
                className={`inline-flex items-center justify-center px-4 py-1.5 bg-brand-orange hover:bg-[#ff8a1d] text-white text-sm font-medium rounded-md transition cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Yükleniyor...
                  </>
                ) : (
                  avatar || avatarPreview ? 'Fotoğraf Değiştir' : 'Fotoğraf Yükle'
                )}
              </label>

              {(avatarPreview || avatar) && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:underline transition"
                >
                  Kaldır
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Username - Editable with 14-day limit */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
            Kullanıcı Adı
          </label>
          {(() => {
            const DAYS_LIMIT = 14;
            const usernameLastChangedAt = user?.usernameLastChangedAt;
            const daysLeft = usernameLastChangedAt
              ? Math.ceil(
                  DAYS_LIMIT -
                    (Date.now() - new Date(usernameLastChangedAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                )
              : 0;
            const isDisabled = daysLeft > 0;

            return (
              <>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    // Sadece küçük harf, rakam, nokta ve alt çizgi kabul et
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '');
                    setUsername(value);
                  }}
                  disabled={isDisabled}
                  className={`w-full bg-white text-[#111] border border-black/10 rounded-lg px-3 py-2 placeholder-gray-400 focus:border-orange-500 transition dark:bg-[#1E1F24] dark:text-white dark:border-white/10 dark:placeholder-white/40 dark:focus:border-orange-400 ${
                    isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  placeholder="kullanıcıadı"
                  minLength={3}
                  maxLength={30}
                />
                {isDisabled ? (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    Kullanıcı adını {daysLeft} gün sonra tekrar değiştirebilirsin.
                  </p>
                ) : (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Kullanıcı adını değiştirebilirsin.
                  </p>
                )}
              </>
            );
          })()}
        </div>

        {/* Full Name */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
            Ad Soyad
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-white text-[#111] border border-black/10 rounded-lg px-3 py-2 placeholder-gray-400 focus:border-orange-500 transition dark:bg-[#1E1F24] dark:text-white dark:border-white/10 dark:placeholder-white/40 dark:focus:border-orange-400"
            placeholder="Adınız ve soyadınız"
          />
        </div>

        {/* Bio */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
            Biyografi
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-white text-[#111] border border-black/10 rounded-lg px-3 py-2 h-[80px] resize-none placeholder-gray-400 focus:border-orange-500 transition dark:bg-[#1E1F24] dark:text-white dark:border-white/10 dark:placeholder-white/40 dark:focus:border-orange-400"
            placeholder="Kendini kısaca tanıt..."
            maxLength={150}
          />
          <p className="text-xs text-gray-500 dark:text-white/50 mt-1 text-right">{bio.length}/150</p>
        </div>

        {/* Website */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
            Bağlantı
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            disabled={isPrivate}
            className={`w-full bg-white text-[#111] border border-black/10 rounded-lg px-3 py-2 placeholder-gray-400 focus:border-orange-500 transition dark:bg-[#1E1F24] dark:text-white dark:border-white/10 dark:placeholder-white/40 dark:focus:border-orange-400 ${isPrivate ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            placeholder="https://example.com"
          />
          {isPrivate && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Gizli hesaplarda bağlantı alanı devre dışı bırakılmıştır.
            </p>
          )}
        </div>

        {/* Date of Birth */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
            Doğum Tarihi <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
            className="w-full bg-white text-[#111] border border-black/10 rounded-lg px-3 py-2 placeholder-gray-400 focus:border-orange-500 transition dark:bg-[#1E1F24] dark:text-white dark:border-white/10 dark:placeholder-white/40 dark:focus:border-orange-400"
          />
          <p className="text-xs text-gray-500 dark:text-white/50 mt-1">
            Yaşınız otomatik olarak hesaplanır (13+ zorunlu)
          </p>
        </div>

        {/* Country */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
            Ülke <span className="text-red-500">*</span>
          </label>
          <select
            value={country ?? ''}
            onChange={(e) => {
              setCountry(e.target.value || null)
              setCity(null) // 🔒 Ülke değişince şehir sıfırlanır
            }}
            className="w-full bg-white text-[#111] border border-black/10 rounded-lg px-3 py-2 placeholder-gray-400 focus:border-orange-500 transition dark:bg-[#1E1F24] dark:text-white dark:border-white/10 dark:placeholder-white/40 dark:focus:border-orange-400"
          >
            <option value="">Ülke seçin</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* City */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
            Şehir <span className="text-red-500">*</span>
          </label>
          <select
            value={city ?? ''}
            onChange={(e) => setCity(e.target.value || null)}
            disabled={!country}
            className="w-full bg-white text-[#111] border border-black/10 rounded-lg px-3 py-2 placeholder-gray-400 focus:border-orange-500 transition dark:bg-[#1E1F24] dark:text-white dark:border-white/10 dark:placeholder-white/40 dark:focus:border-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="" disabled>
              {country ? 'Şehir seçin' : 'Önce ülke seçin'}
            </option>
            {country === 'TR' ? (
              // 🇹🇷 Türkiye için 81 il listesi (sabit, filtreleme yok)
              (() => {
                // 🔍 Console test
                console.log('[Profile Edit] TR_CITIES length:', TR_CITIES.length)
                console.log('[Profile Edit] TR_CITIES:', TR_CITIES)
                return TR_CITIES.map((cityName) => (
                  <option key={cityName} value={cityName}>
                    {cityName}
                  </option>
                ))
              })()
            ) : (
              // Diğer ülkeler için countries.json'dan
              country &&
              countries
                .find((c) => c.code === country)
                ?.cities.map((cityName) => (
                  <option key={cityName} value={cityName}>
                    {cityName}
                  </option>
                ))
            )}
          </select>
        </div>

        {/* Gender */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 dark:text-white/70 mb-2">
            Cinsiyet <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {[
              { value: 'FEMALE', label: 'Kadın' },
              { value: 'MALE', label: 'Erkek' },
              { value: 'UNSPECIFIED', label: 'Belirtmek istemiyorum' },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 p-3 border border-black/10 dark:border-white/10 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2a2b30] transition-colors"
              >
                <input
                  type="radio"
                  name="gender"
                  value={option.value}
                  checked={gender === option.value}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-4 h-4 text-brand-orange focus:ring-brand-orange"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Private Account */}
        <div className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-brand-orange focus:ring-brand-orange focus:ring-offset-0 cursor-pointer bg-white dark:bg-gray-700"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Hesabımı gizli yap</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Gizli hesaplarda yalnızca onayladığınız kişiler gönderilerinizi görebilir
              </p>
            </div>
          </label>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={isLoading || requiredFieldsMissing}
            className="flex-1 bg-[#FF8A00] text-white py-3 rounded-lg hover:bg-[#e67a00] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title={requiredFieldsMissing ? 'Lütfen tüm zorunlu alanları doldurun' : ''}
          >
            {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-gray-700 dark:text-gray-200"
          >
            İptal
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mt-4 p-3 rounded-xl text-sm ${message.includes('başarıyla')
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}
          >
            {message}
          </div>
        )}
      </div>

      {/* Crop Modal */}
      {cropModalOpen && imageSrc && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="relative w-full h-[400px] bg-gray-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Zoom Control */}
            <div className="p-4 bg-white dark:bg-[#111111] border-t border-gray-200 dark:border-gray-800">
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Yakınlaştır
              </label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 p-4 bg-white dark:bg-[#111111] border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={handleCropCancel}
                disabled={isUploading}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                İptal
              </button>
              <button
                onClick={handleCropFinish}
                disabled={isUploading}
                className="flex-1 px-4 py-2.5 bg-brand-orange hover:bg-[#ff8a1d] text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Yükleniyor...
                  </>
                ) : (
                  'Kaydet'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EditProfilePage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="flex h-[50vh] w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
        </div>
      }>
        <EditProfileContent />
      </Suspense>
    </AuthGuard>
  )
}

