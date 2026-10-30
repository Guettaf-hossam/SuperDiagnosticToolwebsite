import { assets } from '@/data/site'

/** Circular product mark using the project's icon from the repository. */
export function ProductMark({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-ink ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 18px -8px rgba(12,12,13,0.6)',
      }}
    >
      <img src={assets.icon} alt="" width={size} height={size} className="size-full object-cover" />
      <span aria-hidden="true" className="absolute inset-0 rounded-full ring-1 ring-white/20 ring-inset" />
    </span>
  )
}
