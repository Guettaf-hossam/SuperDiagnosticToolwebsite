import { useEffect, useRef, useState } from 'react'
import { useInView } from '@/hooks/useInView'

type AmbientVideoProps = {
  src: string
  poster: string
  className?: string
  mediaClassName?: string
  eager?: boolean
}

/**
 * Decorative, silent video that only plays near the viewport. Reduced-motion
 * visitors receive the poster image instead of an autoplaying background.
 */
export function AmbientVideo({
  src,
  poster,
  className = '',
  mediaClassName = '',
  eager = false,
}: AmbientVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '300px 0px' })
  const [loaded, setLoaded] = useState(eager)
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (inView) setLoaded(true)
  }, [inView])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (inView && !reducedMotion) void video.play().catch(() => undefined)
    else video.pause()
  }, [inView, reducedMotion, loaded])

  return (
    <div ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {reducedMotion || !loaded ? (
        <img src={poster} alt="" className={`size-full object-cover ${mediaClassName}`} />
      ) : (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          autoPlay={eager}
          preload={eager ? 'auto' : 'metadata'}
          className={`size-full object-cover ${mediaClassName}`}
        />
      )}
    </div>
  )
}
