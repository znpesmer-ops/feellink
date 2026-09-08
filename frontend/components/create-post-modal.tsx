'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api, { getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { extractColorsFromFile } from '@/utils/extractColors'
import Slider, { Settings } from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { containsBadWord } from '@/lib/utils/containsBadWord'
import { put } from '@vercel/blob/client'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  username: string
  userId?: string // Profile user ID for query invalidation
  postType?: 'post' | 'artwork' // Default: 'post'
}

const MAX_IMAGE_UPLOAD_WIDTH = 2048
const IMAGE_COMPRESSION_THRESHOLD = 900 * 1024
const MAX_CLIENT_UPLOAD_BYTES = 4 * 1024 * 1024
const MAX_DIRECT_MEDIA_UPLOAD_BYTES = 50 * 1024 * 1024
const MAX_MULTIPART_FALLBACK_BYTES = 4 * 1024 * 1024
const BLOB_CLIENT_UPLOAD_TIMEOUT_MS = 55000
const BLOB_TOKEN_TIMEOUT_MS = 45000
const POST_CREATE_TIMEOUT_MS = 45000
const UPLOAD_SESSION_WARMUP_TIMEOUT_MS = 30000

type UploadedPostMedia = {
  url: string
  type: 'image' | 'video'
  order: number
  thumbnailUrl?: string
}

type VideoCover = {
  file: File
  preview: string
  source: 'automatic' | 'manual'
}

const getFileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`

function createAutomaticVideoCover(file: File): Promise<VideoCover | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    let settled = false
    const timeout = window.setTimeout(() => finish(null), 12000)

    function finish(result: VideoCover | null) {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(objectUrl)
      resolve(result)
    }

    const captureFrame = () => {
      if (!video.videoWidth || !video.videoHeight) {
        finish(null)
        return
      }

      const maxWidth = 1280
      const scale = Math.min(1, maxWidth / video.videoWidth)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
      const context = canvas.getContext('2d')

      if (!context) {
        finish(null)
        return
      }

      try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
      } catch {
        finish(null)
        return
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          finish(null)
          return
        }

        const baseName = file.name.replace(/\.[^.]+$/, '') || 'video'
        const coverFile = new File([blob], `${baseName}-kapak.jpg`, { type: 'image/jpeg' })
        finish({
          file: coverFile,
          preview: canvas.toDataURL('image/jpeg', 0.86),
          source: 'automatic',
        })
      }, 'image/jpeg', 0.86)
    }

    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.onerror = () => finish(null)
    video.onloadeddata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      const targetTime = duration > 0.2
        ? Math.min(2, Math.max(0.1, duration * 0.1), Math.max(0.1, duration - 0.05))
        : 0

      if (targetTime > 0) {
        video.onseeked = captureFrame
        try {
          video.currentTime = targetTime
        } catch {
          captureFrame()
        }
      } else {
        captureFrame()
      }
    }
    video.src = objectUrl
    video.load()
  })
}

function createUserFacingUploadError(message: string): Error & { userMessage: string } {
  return Object.assign(new Error(message), { userMessage: message })
}

function withAbortTimeout<T>(run: (signal: AbortSignal) => Promise<T>, timeoutMs: number, message: string): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  return run(controller.signal).catch((error) => {
    if (controller.signal.aborted) {
      throw createUserFacingUploadError(message)
    }
    throw error
  }).finally(() => window.clearTimeout(timer))
}

function resizeImageFile(file: File, maxWidth: number, quality: number): Promise<File> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new window.Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const ratio = image.width > maxWidth ? maxWidth / image.width : 1
      const width = Math.round(image.width * ratio)
      const height = Math.round(image.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }

      ctx.drawImage(image, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const baseName = file.name.replace(/\.[^.]+$/, '') || 'artwork'
          resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality,
      )
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    image.src = objectUrl
  })
}

async function prepareFileForUpload(file: File): Promise<File> {
  if (typeof window === 'undefined') {
    return file
  }

  if (!file.type.startsWith('image/')) {
    if (file.size > MAX_DIRECT_MEDIA_UPLOAD_BYTES) {
      throw createUserFacingUploadError('Bu dosya şu an yükleme sınırını aşıyor. Lütfen 50MB altında bir dosya seçin.')
    }
    return file
  }

  if (file.size < IMAGE_COMPRESSION_THRESHOLD) {
    return file
  }

  const attempts = [
    { width: MAX_IMAGE_UPLOAD_WIDTH, quality: 0.88 },
    { width: 1800, quality: 0.78 },
    { width: 1500, quality: 0.7 },
    { width: 1280, quality: 0.62 },
  ]

  let smallest = file
  for (const attempt of attempts) {
    const compressed = await resizeImageFile(file, attempt.width, attempt.quality)
    if (compressed.size < smallest.size) {
      smallest = compressed
    }
    if (compressed.size <= MAX_CLIENT_UPLOAD_BYTES) {
      return compressed
    }
  }

  if (smallest.size > MAX_CLIENT_UPLOAD_BYTES) {
    throw createUserFacingUploadError('Görsel çok büyük kaldı. Lütfen daha küçük veya daha sıkıştırılmış bir görsel seçin.')
  }
  return smallest
}

async function uploadPostMediaFile(
  file: File,
  order: number,
  onProgress?: (progressRatio: number) => void,
  folder = 'posts',
): Promise<UploadedPostMedia> {
  onProgress?.(0.08)
  const tokenResponse = await api.post('/media/client-upload-token', {
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
    folder,
  }, {
    timeout: BLOB_TOKEN_TIMEOUT_MS,
  } as any)

  const clientToken =
    typeof tokenResponse.data?.clientToken === 'string' ? tokenResponse.data.clientToken : ''
  const pathname =
    typeof tokenResponse.data?.pathname === 'string' ? tokenResponse.data.pathname : ''

  if (!clientToken || !pathname) {
    throw createUserFacingUploadError('Yükleme izni alınamadı. Lütfen tekrar deneyin.')
  }

  onProgress?.(0.35)
  const uploaded = await withAbortTimeout(
    (signal) => put(pathname, file, {
      access: 'public',
      token: clientToken,
      contentType: file.type || undefined,
      multipart: file.size > 8 * 1024 * 1024,
      abortSignal: signal,
    }),
    BLOB_CLIENT_UPLOAD_TIMEOUT_MS,
    'Görsel yükleme zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.',
  )
  onProgress?.(1)

  const uploadedUrl = typeof uploaded?.url === 'string' ? uploaded.url : ''

  if (!uploadedUrl.trim()) {
    throw createUserFacingUploadError('Dosya yüklendi ama medya URL bilgisi alınamadı.')
  }

  return {
    url: uploadedUrl.trim(),
    type: file.type.startsWith('video/') ? 'video' : 'image',
    order,
  }
}

function shouldFallbackToMultipartUpload(error: any, files: File[]): boolean {
  const canUseMultipartFallback = files.every(file => file.size <= MAX_MULTIPART_FALLBACK_BYTES)
  if (!canUseMultipartFallback) return false

  const status = Number(error?.response?.status ?? 0)
  if ([0, 502, 503, 504].includes(status)) return true

  const code = String(error?.code || '')
  const message = String(error?.userMessage || error?.message || error?.response?.data?.message || '')
  return (
    code === 'ECONNABORTED' ||
    code === 'ERR_NETWORK' ||
    /timeout|zaman aşımı|network error|bağlanılamıyor|aborted/i.test(message)
  )
}

function appendPostMetadataToFormData(
  formData: FormData,
  values: {
    caption: string
    title: string
    artworkCreatedDate: string
    postType: 'post' | 'artwork'
    colorPalette: string[]
  },
) {
  if (values.caption.trim()) {
    formData.append('caption', values.caption.trim())
  }
  if (values.title.trim()) {
    formData.append('title', values.title.trim())
  }
  if (values.artworkCreatedDate.trim()) {
    formData.append('artworkCreatedDate', values.artworkCreatedDate.trim())
  }
  formData.append('type', values.postType)
  if (values.colorPalette.length > 0) {
    formData.append('colorPalette', JSON.stringify(values.colorPalette))
  }
}

export function CreatePostModal({ isOpen, onClose, username, userId, postType = 'post' }: CreatePostModalProps) {
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [title, setTitle] = useState('') // 🎨 Eser adı (artwork için)
  const [artworkCreatedDate, setArtworkCreatedDate] = useState('') // 🎨 Eserin oluşturulduğu tarih (opsiyonel)
  const [location, setLocation] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStage, setUploadStage] = useState('')
  const [colorPalette, setColorPalette] = useState<string[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [videoCovers, setVideoCovers] = useState<Record<string, VideoCover>>({})
  const [coverTargetIndex, setCoverTargetIndex] = useState<number | null>(null)
  const [autoCoverFailedKeys, setAutoCoverFailedKeys] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const automaticCoverPromisesRef = useRef<Partial<Record<string, Promise<VideoCover | null>>>>({})
  const sliderRef = useRef<Slider | null>(null)

  // Küfür kontrolü
  const hasBadWord = containsBadWord(caption)

  useEffect(() => {
    if (!isOpen || !accessToken) return

    void api.get('/auth/me', {
      timeout: UPLOAD_SESSION_WARMUP_TIMEOUT_MS,
    } as any).catch(() => {
      // Sessiz warm-up: asıl submit akışı kendi hata mesajını gösterecek.
    })
  }, [isOpen, accessToken])

  const startAutomaticVideoCover = (file: File) => {
    if (!file.type.startsWith('video/')) return

    const key = getFileKey(file)
    if (automaticCoverPromisesRef.current[key]) return

    const promise = createAutomaticVideoCover(file).then((cover) => {
      if (cover) {
        setVideoCovers((current) => current[key] ? current : { ...current, [key]: cover })
      } else {
        setAutoCoverFailedKeys((current) => new Set(current).add(key))
      }
      return cover
    })
    automaticCoverPromisesRef.current[key] = promise
  }

  const createPostMutation = useMutation({
    mutationFn: async () => {
      setUploading(true)
      setError('')
      
      // Küfür kontrolü
      if (hasBadWord) {
        throw createUserFacingUploadError('Bu içerik Feellink topluluk kurallarına uygun değil.')
      }

      setUploadProgress(8)
      setUploadStage('Görsel hazırlanıyor')
      const preparedFiles = await Promise.all(files.map(prepareFileForUpload))
      setUploadProgress(15)

      const media: UploadedPostMedia[] = []
      try {
        for (let index = 0; index < preparedFiles.length; index += 1) {
          const file = preparedFiles[index]
          const uploaded = await uploadPostMediaFile(file, index, (fileProgress) => {
            const combined = 15 + ((index + fileProgress) / preparedFiles.length) * 65
            const nextProgress = Math.min(80, Math.round(combined))
            setUploadProgress(nextProgress)
            if (fileProgress < 0.35) {
              setUploadStage('Yükleme bağlantısı hazırlanıyor...')
            } else if (fileProgress < 1) {
              setUploadStage(`%${nextProgress} Yükleniyor`)
            } else {
              setUploadStage(`%${nextProgress} Yüklendi`)
            }
          })
          const originalFile = files[index]
          const originalFileKey = originalFile ? getFileKey(originalFile) : ''
          let selectedCover = originalFile ? videoCovers[originalFileKey] : undefined
          if (!selectedCover && originalFileKey) {
            selectedCover = (await automaticCoverPromisesRef.current[originalFileKey]) || undefined
          }
          if (uploaded.type === 'video' && selectedCover) {
            setUploadStage('Video kapağı yükleniyor...')
            const preparedCover = await prepareFileForUpload(selectedCover.file)
            const uploadedCover = await uploadPostMediaFile(
              preparedCover,
              0,
              undefined,
              'post-thumbnails',
            )
            uploaded.thumbnailUrl = uploadedCover.url
          }
          media.push(uploaded)
          const completedProgress = Math.min(80, Math.round(15 + ((index + 1) / preparedFiles.length) * 65))
          setUploadProgress(completedProgress)
          setUploadStage(`%${completedProgress} Yüklendi`)
        }
      } catch (uploadError: any) {
        const includesVideo = preparedFiles.some((preparedFile) => preparedFile.type.startsWith('video/'))
        if (includesVideo || !shouldFallbackToMultipartUpload(uploadError, preparedFiles)) {
          throw uploadError
        }

        setUploadProgress(30)
        setUploadStage('Yedek yükleme yolu deneniyor...')

        const formData = new FormData()
        preparedFiles.forEach((file) => {
          formData.append('files', file)
        })
        appendPostMetadataToFormData(formData, {
          caption,
          title,
          artworkCreatedDate,
          postType,
          colorPalette,
        })

        const fallbackResponse = await api.post('/posts/create', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 65000,
        } as any)
        setUploadProgress(100)
        setUploadStage('Tamamlandı')
        return fallbackResponse.data
      }

      setUploadProgress(88)
      setUploadStage('İşleniyor...')

      const payload: Record<string, unknown> = {
        type: postType,
        media,
      }

      if (caption.trim()) {
        payload.caption = caption.trim()
      }

      if (title.trim()) {
        payload.title = title.trim()
      }

      if (artworkCreatedDate.trim()) {
        payload.artworkCreatedDate = artworkCreatedDate.trim()
      }

      if (colorPalette.length > 0) {
        payload.colorPalette = colorPalette
      }

      const response = await api.post('/posts', payload, {
        timeout: POST_CREATE_TIMEOUT_MS,
      } as any)
      setUploadProgress(100)
      setUploadStage('Tamamlandı')
      return response.data
    },
    onSuccess: (data) => {
      // Reset form
      setFiles([])
      setPreviews([])
      setCaption('')
      setTitle('')
      setArtworkCreatedDate('')
      setLocation('')
      setUploadProgress(0)
      setUploadStage('')
      setColorPalette([])
      setCurrentSlide(0)
      setVideoCovers({})
      setCoverTargetIndex(null)
      setAutoCoverFailedKeys(new Set())
      automaticCoverPromisesRef.current = {}
      setError('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // 🎯 OPTIMISTIC UPDATE - Instagram mantığı: Anında sayacı artır
      queryClient.setQueriesData(
        { 
          predicate: (query) => {
            const key = query.queryKey
            return Array.isArray(key) && key[0] === 'profile'
          }
        },
        (oldData: any) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            _count: {
              ...oldData._count,
              posts: (oldData._count?.posts || 0) + 1, // ✅ Anında +1
            }
          }
        }
      )

      // Yeni eser/gönderi, backend refetch beklenmeden profil gridine düşsün.
      if (data?.id) {
        queryClient.setQueriesData(
          {
            predicate: (query) => {
              const key = query.queryKey
              return Array.isArray(key) && key[0] === 'user-posts'
            },
          },
          (oldData: any) => {
            const oldItems = Array.isArray(oldData) ? oldData : []
            const withoutDuplicate = oldItems.filter((item: any) => item?.id !== data.id)
            return [data, ...withoutDuplicate]
          },
        )
      }
      
      // Invalidate queries to refresh posts (background refresh)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey
          return Array.isArray(key) && key[0] === 'profile'
        }
      })
      
      // Invalidate user posts query (critical for profile page)
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['user-posts', userId] })
      }
      
      // Also invalidate by username pattern (fallback)
      queryClient.invalidateQueries({ queryKey: ['user-posts'] })
      
      // Invalidate profile-posts query for highlights modal
      queryClient.invalidateQueries({ queryKey: ['profile-posts', username] })
      
      // Invalidate user-artworks query for artworks tab
      queryClient.invalidateQueries({ queryKey: ['user-artworks', userId || username] })
      
      // Close modal
      onClose()
    },
    onError: (error: any) => {
      // 🔍 DEBUG: ULTRA DETAYLI error logging
      console.error('❌ [CreatePost] ========== POST CREATE ERROR ==========')
      console.error('❌ [CreatePost] Error message:', error?.message)
      console.error('❌ [CreatePost] Error code:', error?.code)
      console.error('❌ [CreatePost] Status code:', error?.response?.status)
      console.error('❌ [CreatePost] Status text:', error?.response?.statusText)
      console.error('❌ [CreatePost] Response data:', error?.response?.data)
      console.error('❌ [CreatePost] Request URL:', error?.config?.url)
      console.error('❌ [CreatePost] Full error:', error)
      
      // ✅ HATA TİPİ KONTROLÜ VE ÇÖZÜM ÖNERİSİ
      if (error?.response?.status === 401) {
        console.error('🚨 [CreatePost] 401 UNAUTHORIZED!')
        console.error('🚨 [CreatePost] Auth token geçersiz! LOGOUT → LOGIN yap!')
      } else if (error?.response?.status === 413) {
        console.error('🚨 [CreatePost] 413 CONTENT TOO LARGE!')
        console.error('🚨 [CreatePost] Dosya çok büyük! Max 50MB')
      } else if (error?.response?.status === 500) {
        console.error('🚨 [CreatePost] 500 INTERNAL SERVER ERROR!')
        console.error('🚨 [CreatePost] Backend crash! Vercel log\'larını kontrol et!')
      } else if (!error?.response) {
        console.error('🚨 [CreatePost] NETWORK ERROR!')
        console.error('🚨 [CreatePost] Backend\'e erişilemiyor veya CORS hatası!')
      }
      
      console.error('❌ [CreatePost] ========== END ERROR ==========')

      setError(error?.userMessage || getErrorMessage(error))
    },
    onSettled: () => {
      setUploading(false)
      setUploadProgress(0)
      setUploadStage('')
    },
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      
      // 🎨 Eser için sadece 1 dosya kontrolü
      if (postType === 'artwork') {
        if (selectedFiles.length > 1) {
          setError('Eser için yalnızca 1 görsel yüklenebilir.')
          e.target.value = '' // Input'u temizle
          return
        }
        if (files.length >= 1) {
          setError('Eser için sadece 1 görsel seçebilirsiniz. Mevcut görseli kaldırmak için üzerindeki ✕ butonuna tıklayın.')
          e.target.value = '' // Input'u temizle
          return
        }
        // Tek dosya - direkt ayarla
        const singleFile = selectedFiles[0]
        setFiles([singleFile])
      } else {
        // 📷 Post için multiple dosya (max 5)
        if (files.length + selectedFiles.length > 5) {
          setError('En fazla 5 görsel yükleyebilirsiniz.')
          e.target.value = '' // Input'u temizle
          return
        }
        
        const newFiles = [...files, ...selectedFiles].slice(0, 5) // Max 5 files
        setFiles(newFiles)
      }

      selectedFiles.forEach(startAutomaticVideoCover)
      
      // Create previews - Artwork ve Post için ayrı işlem
      if (postType === 'artwork') {
        // 🎨 Eser için tek dosya preview
        const singleFile = selectedFiles[0]
        const reader = new FileReader()
        reader.onload = (event) => {
          setPreviews([event.target?.result as string])
        }
        reader.readAsDataURL(singleFile)
        
        // Renk analizi - ilk görsel için
        if (singleFile.type.startsWith('image/')) {
          try {
            const colors = await extractColorsFromFile(singleFile)
            setColorPalette(colors)
          } catch (err) {
            console.error('Renk analizi hatası:', err)
            setColorPalette([])
          }
        }
      } else {
        // 📷 Post için çoklu dosya preview
        const newFiles = [...files, ...selectedFiles].slice(0, 5)
        const previewPromises = newFiles.map((file) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              resolve(e.target?.result as string)
            }
            reader.readAsDataURL(file)
          })
        })

        Promise.all(previewPromises).then((previewUrls) => {
          setPreviews(previewUrls)
        })

        // 🎨 Renk analizi - ilk görsel için
        if (selectedFiles.length > 0 && selectedFiles[0].type.startsWith('image/')) {
          try {
            const colors = await extractColorsFromFile(selectedFiles[0])
            setColorPalette(colors)
          } catch (err) {
            console.error('Renk analizi hatası:', err)
            setColorPalette([])
          }
        }
      }
      
      // Input'u temizle
      e.target.value = ''
    }
  }

  const removeFile = (index: number) => {
    const removedFile = files[index]
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    setFiles(newFiles)
    setPreviews(newPreviews)
    if (removedFile) {
      const removedKey = getFileKey(removedFile)
      delete automaticCoverPromisesRef.current[removedKey]
      setAutoCoverFailedKeys((current) => {
        const next = new Set(current)
        next.delete(removedKey)
        return next
      })
      setVideoCovers((current) => {
        const next = { ...current }
        delete next[removedKey]
        return next
      })
    }
    
    // Eğer silinen görsel aktif slide ise, yeni aktif slide'ı ayarla
    if (index === currentSlide && newPreviews.length > 0) {
      // Son görsel silindiyse, bir öncekine geç
      const newCurrentSlide = index >= newPreviews.length ? newPreviews.length - 1 : currentSlide
      setCurrentSlide(newCurrentSlide)
      if (sliderRef.current) {
        sliderRef.current.slickGoTo(newCurrentSlide)
      }
    } else if (newPreviews.length === 0) {
      setCurrentSlide(0)
    }
    
    // Renk paletini yeniden hesapla (ilk görsel varsa)
    if (newFiles.length > 0 && newFiles[0].type.startsWith('image/')) {
      extractColorsFromFile(newFiles[0]).then((colors) => {
        setColorPalette(colors)
      }).catch(() => {
        setColorPalette([])
      })
    } else {
      setColorPalette([])
    }
  }

  const requestVideoCover = (index: number) => {
    setCoverTargetIndex(index)
    coverInputRef.current?.click()
  }

  const handleVideoCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const coverFile = event.target.files?.[0]
    const targetFile = coverTargetIndex === null ? null : files[coverTargetIndex]
    event.target.value = ''

    if (!coverFile || !targetFile || !targetFile.type.startsWith('video/')) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const preview = String(loadEvent.target?.result || '')
      setVideoCovers((current) => ({
        ...current,
        [getFileKey(targetFile)]: { file: coverFile, preview, source: 'manual' },
      }))
      setAutoCoverFailedKeys((current) => {
        const next = new Set(current)
        next.delete(getFileKey(targetFile))
        return next
      })
    }
    reader.readAsDataURL(coverFile)
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || postType === 'artwork') {
      return // Eser için drag & drop yok
    }

    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index

    if (sourceIndex === destinationIndex) {
      return // Aynı yere bırakıldı, değişiklik yok
    }

    // Files ve previews dizilerini yeniden sırala
    const newFiles = Array.from(files)
    const newPreviews = Array.from(previews)

    const [movedFile] = newFiles.splice(sourceIndex, 1)
    const [movedPreview] = newPreviews.splice(sourceIndex, 1)

    newFiles.splice(destinationIndex, 0, movedFile)
    newPreviews.splice(destinationIndex, 0, movedPreview)

    setFiles(newFiles)
    setPreviews(newPreviews)

    // Eğer aktif slide değiştirildiyse, yeni pozisyona git
    if (currentSlide === sourceIndex) {
      setCurrentSlide(destinationIndex)
      if (sliderRef.current) {
        sliderRef.current.slickGoTo(destinationIndex)
      }
    } else if (sourceIndex < currentSlide && destinationIndex >= currentSlide) {
      // Soldan sağa taşındı, current slide bir geri
      setCurrentSlide(currentSlide - 1)
    } else if (sourceIndex > currentSlide && destinationIndex <= currentSlide) {
      // Sağdan sola taşındı, current slide bir ileri
      setCurrentSlide(currentSlide + 1)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (files.length === 0) {
      setError('Lütfen en az bir fotoğraf veya video seçin')
      return
    }
    createPostMutation.mutate()
  }

  const handleClose = () => {
    if (uploading) return
    setFiles([])
    setPreviews([])
    setCaption('')
    setTitle('')
    setArtworkCreatedDate('')
    setLocation('')
    setUploadProgress(0)
    setUploadStage('')
    setColorPalette([])
    setCurrentSlide(0)
    setVideoCovers({})
    setCoverTargetIndex(null)
    setAutoCoverFailedKeys(new Set())
    automaticCoverPromisesRef.current = {}
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    // Slider'ı temizle - overlay sorununu önlemek için
    if (sliderRef.current) {
      sliderRef.current.slickGoTo(0)
    }
    onClose()
  }

  // Modal kapandığında slider overlay'lerini temizle
  useEffect(() => {
    if (!isOpen) {
      // Modal kapandığında slider'ı sıfırla
      setCurrentSlide(0)
      // Slider overlay'lerini DOM'dan temizle
      const slickOverlays = document.querySelectorAll('.slick-slider:not(.slick-custom)')
      slickOverlays.forEach((overlay) => {
        const element = overlay as HTMLElement
        if (element.style && element.style.pointerEvents === 'auto') {
          element.style.pointerEvents = 'none'
        }
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-[#101014] dark:bg-[#0f0f0f] w-full max-w-[550px] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modern Gradient Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#1b1b1f] to-[#232329] dark:from-[#1a1a1a] dark:to-[#222222] flex items-center justify-between border-b border-gray-800 dark:border-gray-700">
          <h2 className="text-white text-lg font-semibold">Yeni Gönderi Oluştur</h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-gray-400 hover:text-white text-xl leading-none disabled:opacity-50 transition-colors p-1 hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Content - DragDropContext ile sarmalanmış (sadece post için çalışır) */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <form onSubmit={handleSubmit} className="px-5 pt-6 pb-5 space-y-5">
            {/* File Upload */}
            <div>
              {previews.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 border border-gray-700 dark:border-gray-600 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-[#18181d] dark:hover:bg-gray-800/50 transition-colors"
                >
                  <p className="text-4xl mb-3 opacity-60">📷</p>
                  <p className="text-gray-300 dark:text-gray-300 text-sm font-medium mb-1">Fotoğraf veya video seç</p>
                  <span className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                    {postType === 'artwork' 
                      ? 'Eser için 1 görsel seçebilirsin' 
                      : 'En fazla 5 görsel seçebilirsin'}
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                {/* 🎨 Eser için: Sadece tek görsel, slider ve thumbnail yok */}
                {postType === 'artwork' ? (
                  <div className="relative bg-[#151519] dark:bg-gray-800 rounded-xl overflow-hidden">
                    <div className="relative aspect-square">
                      {files[0]?.type.startsWith('video/') ? (
                        <video
                          src={previews[0]}
                          poster={videoCovers[getFileKey(files[0])]?.preview}
                          className="w-full h-full object-contain bg-black rounded-xl"
                          controls
                        />
                      ) : (
                        <img
                          src={previews[0]}
                          alt="Preview"
                          className="w-full h-full object-contain bg-black rounded-xl"
                        />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(0)
                        }}
                        disabled={uploading}
                        className="absolute top-3 right-3 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 disabled:opacity-50 transition-colors shadow-lg z-10"
                        title="Kaldır"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 📷 Post için: Çoklu görsel, slider ve thumbnail var */
                  <>
                    {/* Instagram benzeri carousel - Ana önizleme (çoklu görsel için) */}
                    {previews.length > 1 ? (
                      <div className="relative w-full overflow-hidden [&_.slick-slider]:pointer-events-auto bg-[#151519] dark:bg-gray-800 rounded-xl">
                        <Slider
                          ref={sliderRef}
                          dots={true}
                          infinite={false}
                          speed={300}
                          slidesToShow={1}
                          slidesToScroll={1}
                          arrows={true}
                          className="slick-custom"
                          swipe={true}
                          touchMove={true}
                          beforeChange={(current, next) => setCurrentSlide(next)}
                        >
                          {previews.map((preview, index) => (
                            <div key={index} className="relative aspect-square pointer-events-auto">
                              {files[index].type.startsWith('video/') ? (
                                <video
                                  src={preview}
                                  poster={videoCovers[getFileKey(files[index])]?.preview}
                                  className="w-full h-full object-contain bg-black rounded-xl"
                                  controls
                                />
                              ) : (
                                <img
                                  src={preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-full object-contain bg-black rounded-xl"
                                />
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeFile(index)
                                }}
                                disabled={uploading}
                                className="absolute top-3 right-3 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 disabled:opacity-50 transition-colors shadow-lg z-10 pointer-events-auto"
                                title="Kaldır"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </Slider>
                      </div>
                    ) : (
                      /* Tek görsel - Carousel yok */
                      <div className="relative bg-[#151519] dark:bg-gray-800 rounded-xl overflow-hidden">
                        <div className="relative aspect-square">
                          {files[0].type.startsWith('video/') ? (
                            <video
                              src={previews[0]}
                              poster={videoCovers[getFileKey(files[0])]?.preview}
                              className="w-full h-full object-contain bg-black rounded-xl"
                              controls
                            />
                          ) : (
                            <img
                              src={previews[0]}
                              alt="Preview"
                              className="w-full h-full object-contain bg-black rounded-xl"
                            />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFile(0)
                            }}
                            disabled={uploading}
                            className="absolute top-3 right-3 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 disabled:opacity-50 transition-colors shadow-lg z-10"
                            title="Kaldır"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Thumbnail önizlemeleri - Drag & Drop ile sıralama (sadece post için, 1'den fazla görsel varsa) */}
                    {previews.length > 1 && (
                      <Droppable droppableId="thumbnails" direction="horizontal">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex gap-2 justify-center overflow-x-auto pb-2 ${
                              snapshot.isDraggingOver ? 'bg-[#18181d]/30 rounded-lg' : ''
                            }`}
                          >
                            {previews.map((preview, index) => {
                              // Unique ID oluştur - file name, size ve index kombinasyonu
                              const uniqueId = `thumb-${index}-${files[index]?.name || 'file'}-${files[index]?.size || 0}`
                              return (
                                <Draggable
                                  key={uniqueId}
                                  draggableId={uniqueId}
                                  index={index}
                                >
                                  {(providedDrag, snapshotDrag) => (
                                    <div
                                      ref={providedDrag.innerRef}
                                      {...providedDrag.draggableProps}
                                      {...providedDrag.dragHandleProps}
                                      className={`flex-shrink-0 relative ${
                                        snapshotDrag.isDragging ? 'opacity-50 z-[100]' : 'z-auto'
                                      }`}
                                      style={providedDrag.draggableProps.style}
                                    >
                                      <div
                                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${
                                          currentSlide === index
                                            ? 'border-brand-orange ring-2 ring-brand-orange/30'
                                            : 'border-gray-700 hover:border-brand-orange/50'
                                        } ${snapshotDrag.isDragging ? 'shadow-2xl scale-110' : 'shadow-lg'}`}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (sliderRef.current && !snapshotDrag.isDragging) {
                                            sliderRef.current.slickGoTo(index)
                                          }
                                        }}
                                      >
                                        {files[index].type.startsWith('video/') ? (
                                          videoCovers[getFileKey(files[index])] ? (
                                            <img
                                              src={videoCovers[getFileKey(files[index])].preview}
                                              alt={`Video kapağı ${index + 1}`}
                                              className="w-full h-full object-cover pointer-events-none"
                                            />
                                          ) : (
                                            <video
                                              src={preview}
                                              className="w-full h-full object-cover pointer-events-none"
                                              muted
                                            />
                                          )
                                        ) : (
                                          <img
                                            src={preview}
                                            alt={`Thumbnail ${index + 1}`}
                                            className="w-full h-full object-cover pointer-events-none"
                                          />
                                        )}
                                      </div>
                                      {/* Silme butonu - Drag handle dışında, tıklamayı engellemez */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          e.preventDefault()
                                          removeFile(index)
                                        }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation()
                                        }}
                                        disabled={uploading}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50 transition-colors shadow-lg z-20 pointer-events-auto"
                                        title="Kaldır"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  )}
                                </Draggable>
                              )
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    )}

                    {/* Görsel ekleme butonu - 5'ten az varsa göster (sadece post için) */}
                    {files.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border border-dashed border-gray-700 dark:border-gray-600 rounded-xl py-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-[#18181d] dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <span className="text-xl text-gray-400">➕</span>
                        <span className="text-sm text-gray-400 dark:text-gray-400">
                          Daha fazla görsel ekle ({files.length}/5)
                        </span>
                      </button>
                    )}

                    {files.map((file, index) => file.type.startsWith('video/') && (
                      <div key={`video-cover-${getFileKey(file)}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-200">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {videoCovers[getFileKey(file)]?.source === 'manual'
                              ? 'Seçtiğin kapak fotoğrafı hazır'
                              : videoCovers[getFileKey(file)]?.source === 'automatic'
                                ? 'Videodan otomatik kapak oluşturuldu'
                                : autoCoverFailedKeys.has(getFileKey(file))
                                  ? 'Otomatik kapak oluşturulamadı; istersen bir görsel seç'
                                  : 'Videodan otomatik kapak hazırlanıyor...'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => requestVideoCover(index)}
                          disabled={uploading}
                          className="shrink-0 rounded-lg border border-[#ff7b00]/50 bg-[#ff7b00]/10 px-3 py-2 text-xs font-semibold text-[#ff9a3c] transition hover:bg-[#ff7b00]/20 disabled:opacity-50"
                        >
                          {videoCovers[getFileKey(file)] ? 'Kapağı değiştir' : 'Kapak seç'}
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple={postType !== 'artwork'} // 🎨 Eser için multiple=false, Post için multiple=true
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleVideoCoverChange}
              className="hidden"
              disabled={uploading}
            />
          </div>

          {/* Eser Adı (sadece artwork için) */}
          {postType === 'artwork' && (
            <>
              <div>
                <label htmlFor="title" className="block text-gray-300 dark:text-gray-300 text-sm mb-2">
                  Eser Adı <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Eserinizin adını girin"
                  required
                  disabled={uploading}
                  className="w-full mt-2 bg-[#151519] dark:bg-gray-800 text-gray-200 dark:text-gray-200 rounded-xl px-4 py-3 border border-gray-700 dark:border-gray-600 focus:border-brand-orange focus:outline-none resize-none placeholder-gray-500 transition-all"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Eserinizi tanımlayan bir ad girin
                </p>
              </div>
              <div>
                <label htmlFor="artworkCreatedDate" className="block text-gray-300 dark:text-gray-300 text-sm mb-2">
                  Eserin Oluşturulduğu Tarih
                </label>
                <input
                  id="artworkCreatedDate"
                  type="date"
                  value={artworkCreatedDate}
                  onChange={(e) => setArtworkCreatedDate(e.target.value)}
                  disabled={uploading}
                  className="w-full mt-2 bg-[#151519] dark:bg-gray-800 text-gray-200 dark:text-gray-200 rounded-xl px-4 py-3 border border-gray-700 dark:border-gray-600 focus:border-brand-orange focus:outline-none placeholder-gray-500 transition-all [color-scheme:dark]"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  İsteğe bağlı — eserin yapıldığı günü kaydedebilirsin
                </p>
              </div>
            </>
          )}

          {/* Caption */}
          <div>
            <label htmlFor="caption" className="block text-gray-300 dark:text-gray-300 text-sm mb-2">
              Açıklama
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Açıklama yaz... #hashtag kullanabilirsin"
              rows={4}
              disabled={uploading}
              className="w-full mt-2 bg-[#151519] dark:bg-gray-800 text-gray-200 dark:text-gray-200 rounded-xl px-4 py-3 border border-gray-700 dark:border-gray-600 focus:border-brand-orange focus:outline-none resize-none placeholder-gray-500 transition-all"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Açıklamana #hashtag ekleyerek gönderini kategorize edebilirsin
            </p>
            {hasBadWord && (
              <p className="text-xs text-orange-500 mt-1">
                Bu içerik Feellink topluluk kurallarına uygun değil.
              </p>
            )}
          </div>

          {/* Konum alanı kaldırıldı */}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 dark:bg-red-900/20 border border-red-800 dark:border-red-800 text-red-400 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Premium Buttons */}
          <div className="flex justify-between pt-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="px-6 py-2 rounded-xl bg-gray-700 dark:bg-gray-700 text-gray-200 dark:text-gray-200 hover:bg-gray-600 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={uploading || files.length === 0 || hasBadWord}
              className="px-8 py-2 rounded-xl bg-brand-orange text-white font-semibold hover:bg-[#e67a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (uploadStage || (uploadProgress > 0 ? `%${uploadProgress} Yüklendi` : 'Hazırlanıyor...')) : 'Paylaş'}
            </button>
          </div>
        </form>
        </DragDropContext>
      </div>
    </div>
  )
}
