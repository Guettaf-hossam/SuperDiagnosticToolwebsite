import { useEffect, useRef, useState } from 'react'

/** Tracks whether an element is in the viewport. `once` stops observing after first entry. */
export function useInView<T extends Element>(options: { once?: boolean; rootMargin?: string } = {}) {
  const { once = false, rootMargin = '0px 0px -10% 0px' } = options
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [once, rootMargin])

  return { ref, inView }
}
