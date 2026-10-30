/** 4×4 pixel block logo mark, carried over from the original single-page site. */
const PATTERN = '1110101101111011'

export function PixelMark({ cell = 5, className = '' }: { cell?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-grid shrink-0 gap-px ${className}`}
      style={{ gridTemplateColumns: `repeat(4, ${cell}px)` }}
    >
      {Array.from(PATTERN).map((bit, i) => (
        <b key={i} className={bit === '1' ? 'bg-current' : 'bg-transparent'} style={{ width: cell, height: cell }} />
      ))}
    </span>
  )
}
