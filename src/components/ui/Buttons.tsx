import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'

type LinkButtonProps = {
  href: string
  children: ReactNode
  icon?: ReactNode
  className?: string
  size?: 'md' | 'lg'
}

const external = { target: '_blank', rel: 'noopener noreferrer' } as const

/** Glossy near-black pill with a thin iridescent edge and a circular arrow. */
export function PrimaryButton({ href, children, className = '', size = 'lg' }: LinkButtonProps) {
  const pad = size === 'lg' ? 'h-14 pl-6 pr-2 text-[15px]' : 'h-12 pl-5 pr-1.5 text-[14px]'
  return (
    <a
      href={href}
      {...external}
      className={`group relative inline-flex rounded-full p-px transition-transform duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] ${className}`}
    >
      <span aria-hidden="true" className="iri-gradient absolute inset-0 rounded-full opacity-90" />
      <span
        className={`relative inline-flex w-full items-center justify-between gap-4 rounded-full font-medium text-white ${pad}`}
        style={{
          background: 'linear-gradient(180deg, #3b3b3f 0%, #161618 46%, #050506 100%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.6), 0 10px 24px -10px rgba(12,12,13,0.55)',
        }}
      >
        <span className="whitespace-nowrap">{children}</span>
        <span
          aria-hidden="true"
          className={`grid shrink-0 place-items-center rounded-full bg-white text-ink transition-transform duration-300 group-hover:rotate-45 ${size === 'lg' ? 'size-10' : 'size-9'}`}
        >
          <ArrowUpRight className="size-4" strokeWidth={2.2} />
        </span>
      </span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

/** Translucent silver pill with soft inner highlight. */
export function SecondaryButton({ href, children, icon, className = '', size = 'lg' }: LinkButtonProps) {
  const pad = size === 'lg' ? 'h-14 px-6 text-[15px]' : 'h-12 px-5 text-[14px]'
  return (
    <a
      href={href}
      {...external}
      className={`inline-flex items-center justify-center gap-2.5 rounded-full border border-white/80 font-medium whitespace-nowrap text-ink backdrop-blur-md transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/80 active:translate-y-0 active:scale-[0.985] ${pad} ${className}`}
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(220,220,226,0.62) 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(160,160,170,0.35), 0 1px 2px rgba(12,12,13,0.06), 0 10px 24px -14px rgba(12,12,13,0.28)',
      }}
    >
      {icon}
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

/** Inline text link to an external resource. */
export function TextLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      {...external}
      className={`font-medium underline decoration-current/30 underline-offset-[3px] transition-colors hover:decoration-current ${className}`}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}
