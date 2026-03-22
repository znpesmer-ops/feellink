'use client'

import Image from 'next/image'

const SRC_LIGHT = '/logo/logo-light.png'
const SRC_DARK = '/logo/logo-dark.png'

export type AppLogoProps = {
  className?: string
  /** Intrinsic width for next/image (layout stability) */
  width?: number
  /** Intrinsic height for next/image */
  height?: number
  priority?: boolean
  alt?: string
}

/**
 * Light / dark logo: Tailwind `darkMode: 'class'` ile `html.dark` senkronu.
 * Tek `Image` + useTheme yerine iki görsel — tema değişince anında CSS ile değişir.
 */
export function AppLogo({
  className = '',
  width = 160,
  height = 48,
  priority = false,
  alt = 'Feellink Logo',
}: AppLogoProps) {
  const base = className.trim()

  return (
    <>
      <Image
        src={SRC_LIGHT}
        alt={alt}
        width={width}
        height={height}
        className={[base, 'dark:hidden'].filter(Boolean).join(' ')}
        priority={priority}
      />
      <Image
        src={SRC_DARK}
        alt={alt}
        width={width}
        height={height}
        className={[base, 'hidden dark:block'].filter(Boolean).join(' ')}
        priority={priority}
      />
    </>
  )
}
