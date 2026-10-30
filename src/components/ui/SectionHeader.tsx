import type { ReactNode } from 'react'
import { Reveal } from './Reveal'

type Props = {
  label: string
  heading: ReactNode
  body?: ReactNode
  align?: 'center' | 'left'
  dark?: boolean
  id?: string
}

export function SectionHeader({ label, heading, body, align = 'center', dark = false, id }: Props) {
  const centered = align === 'center'
  return (
    <div className={`${centered ? 'mx-auto text-center' : ''} max-w-[760px]`}>
      <Reveal>
        <p className={`eyebrow ${dark ? 'text-zinc-400' : ''}`}>{label}</p>
      </Reveal>
      <Reveal delay={60}>
        <h2 id={id} className={`h-section mt-5 ${dark ? 'text-white' : ''}`}>
          {heading}
        </h2>
      </Reveal>
      {body && (
        <Reveal delay={120}>
          <p
            className={`mt-5 text-[17px] leading-[1.6] text-pretty lg:text-[18px] ${centered ? 'mx-auto' : ''} max-w-[600px] ${dark ? 'text-zinc-400' : 'text-muted'}`}
          >
            {body}
          </p>
        </Reveal>
      )}
    </div>
  )
}
