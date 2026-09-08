'use client'

import Image from 'next/image'

const SRC_LIGHT = '/logo/feellink-app-logo-premium-v1.png'
const SRC_DARK = '/logo/feellink-app-logo-premium-v1.png'

export type AppLogoProps = {
  className?: string
  /** Intrinsic width for next/image (layout stability) */
  width?: number
  /** Intrinsic height for next/image */
  height?: number
  priority?: boolean
  alt?: string
}

export type AnimatedFeellinkLogoProps = {
  className?: string
  priority?: boolean
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
  const logoClass = [base, 'feellink-logo'].filter(Boolean).join(' ')

  return (
    <>
      <Image
        src={SRC_LIGHT}
        alt={alt}
        width={width}
        height={height}
        className={[logoClass, 'bg-transparent dark:hidden'].filter(Boolean).join(' ')}
        priority={priority}
      />
      <Image
        src={SRC_DARK}
        alt={alt}
        width={width}
        height={height}
        className={[logoClass, 'hidden bg-transparent dark:block'].filter(Boolean).join(' ')}
        priority={priority}
      />
    </>
  )
}

export function AnimatedFeellinkLogo({
  className = '',
  priority = false,
}: AnimatedFeellinkLogoProps) {
  const wrapperClass = ['feellink-sidebar-logo-reveal', className.trim()]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={wrapperClass} aria-label="Feellink" role="img">
      <span className="feellink-sidebar-logo-core" aria-hidden="true">
        <Image
          src="/logo/feellink-short-mark-transparent.png"
          alt=""
          width={512}
          height={512}
          className="feellink-sidebar-logo-mark"
          priority={priority}
          unoptimized
        />
      </span>
      <span className="feellink-sidebar-logo-wing feellink-sidebar-logo-wing--left" aria-hidden="true">
        <Image
          src="/logo/feellink-login-pill-transparent.png"
          alt=""
          width={520}
          height={192}
          className="feellink-sidebar-logo"
          priority={priority}
          unoptimized
        />
      </span>
      <span className="feellink-sidebar-logo-wing feellink-sidebar-logo-wing--right" aria-hidden="true">
        <Image
          src="/logo/feellink-login-pill-transparent.png"
          alt=""
          width={520}
          height={192}
          className="feellink-sidebar-logo"
          priority={priority}
          unoptimized
        />
      </span>
      <span className="feellink-sidebar-logo-bridge" aria-hidden="true" />
      <span className="feellink-sidebar-logo-final" aria-hidden="true">
        <Image
          src="/logo/feellink-login-pill-transparent.png"
          alt=""
          width={520}
          height={192}
          className="feellink-sidebar-logo"
          priority={priority}
          unoptimized
        />
      </span>
      <span className="feellink-sidebar-logo-flare" aria-hidden="true" />
    </span>
  )
}
