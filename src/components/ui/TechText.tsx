import { useEffect, useRef } from 'react'

type Options = {
  text: string
  weight?: number
  size?: number
  spacing?: number
  specks?: number
  bounce?: number
  dash?: number
  gap?: number
  stroke?: number
  sweep?: boolean
  speed?: number
  kick?: boolean
}

type Sprite = { image: HTMLCanvasElement; left: number; top: number }
type Box = { x1: number; y1: number; x2: number; y2: number }
type Vec = { x: number; y: number }
type Glyph = {
  char: string
  x: number
  box: Box
  offset: Vec
  velocity: Vec
  outline: number
  fill: Sprite
  dashes: Sprite
}
type View = { size: number; baseline: number; left: number; right: number; top: number; bottom: number }

/**
 * Interactive canvas wordmark: letters can be hovered, dragged and kicked.
 * Ported from the original single-page SuperDiagnosticTool site. Ink follows the element's CSS `color`.
 */
function mountTechText(el: HTMLElement, opt: Options) {
  const o = {
    weight: 600, size: 150, spacing: -0.05, specks: 15, bounce: 0.4, dash: 4, gap: 2, stroke: 1.5,
    sweep: true, speed: 1, kick: true, ...opt,
  }
  const cv = document.createElement('canvas')
  cv.className = 'block size-full'
  el.appendChild(cv)
  const ctx = cv.getContext('2d')!
  const probe = document.createElement('canvas').getContext('2d')!
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const SPRING = 320
  let W = 1, H = 1, dpr = 1, raf = 0, last = performance.now(), vis = false
  let glyphs: Glyph[] = [], view: View | null = null, key = '', drag = -1, clock = 0, pulse = 0, placed = false, cursor = ''
  let askedFont = ''
  let disposed = false
  const ptr = { x: 0, y: 0, inside: false }, grab = { x: 0, y: 0 }, press = { x: 0, y: 0, t: 0, i: -1 }
  const frame = { x1: 0, y1: 0, x2: 0, y2: 0, a: 0, i: -1 }, lens = { x: 0, y: 0 }
  const kicks: { i: number; at: number; v: number }[] = []

  const approach = (c: number, t: number, dt: number, s: number) => c + (t - c) * (1 - Math.exp(-dt / s))
  const noise = (...v: number[]) => {
    let h = 2166136261
    for (const x of v) {
      h = Math.imul(h ^ (x | 0), 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15
    }
    return (h >>> 0) / 4294967296
  }
  const fam = () => getComputedStyle(el).fontFamily || 'sans-serif'
  const setFont = (t: CanvasRenderingContext2D, size: number) => {
    t.font = `${o.weight} ${size}px ${fam()}`
    if ('letterSpacing' in t) (t as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${o.spacing * size}px`
    t.textAlign = 'left'; t.textBaseline = 'alphabetic'
  }
  const wake = () => { if (disposed || raf || !vis) return; last = performance.now(); raf = requestAnimationFrame(tick) }
  const refresh = () => { key = ''; wake() }

  function sprite(g: { char: string; x: number; box: Box }, v: View, stroke: boolean, ink: string): Sprite {
    const pad = Math.ceil(o.stroke * 2 + 4)
    const left = g.box.x1 - pad, top = g.box.y1 - pad
    const w = g.box.x2 - g.box.x1 + pad * 2, h = g.box.y2 - g.box.y1 + pad * 2
    const image = document.createElement('canvas')
    image.width = Math.max(1, Math.ceil(w * dpr)); image.height = Math.max(1, Math.ceil(h * dpr))
    const c = image.getContext('2d')!
    c.setTransform(dpr, 0, 0, dpr, -left * dpr, -top * dpr)
    setFont(c, v.size)
    if (stroke) {
      c.lineJoin = 'round'; c.lineWidth = o.stroke * 2; c.strokeStyle = ink
      c.setLineDash([o.dash, o.gap]); c.strokeText(g.char, g.x, v.baseline); c.setLineDash([])
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.fillText(g.char, g.x, v.baseline)
    } else {
      c.fillStyle = ink; c.fillText(g.char, g.x, v.baseline)
    }
    return { image, left, top }
  }

  function layout(ink: string): View {
    const k = [o.text, fam(), W, H, dpr, ink].join('|')
    if (k === key && view) return view
    key = k
    const want = `${o.weight} 64px ${fam()}`
    if (document.fonts && want !== askedFont) { askedFont = want; document.fonts.load(want, o.text).then(refresh, refresh) }
    setFont(probe, o.size)
    let m = probe.measureText(o.text)
    const fit = Math.min(
      1,
      (W * 0.98) / Math.max(m.actualBoundingBoxLeft + m.actualBoundingBoxRight, 1),
      (H * 0.78) / Math.max(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent, 1),
    )
    const size = o.size * fit
    setFont(probe, size)
    m = probe.measureText(o.text)
    const iw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, ih = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
    const x = (W - iw) / 2 + m.actualBoundingBoxLeft
    const baseline = (H - ih) / 2 + m.actualBoundingBoxAscent
    const v: View = {
      size, baseline, left: x - m.actualBoundingBoxLeft, right: x + m.actualBoundingBoxRight,
      top: baseline - m.actualBoundingBoxAscent, bottom: baseline + m.actualBoundingBoxDescent,
    }
    view = v
    const prev = glyphs; glyphs = []
    let prefix = ''
    Array.from(o.text).forEach((char) => {
      prefix += char
      const own = probe.measureText(char)
      const gx = x + probe.measureText(prefix).width - own.width
      if (!char.trim()) return
      const base = {
        char, x: gx,
        box: { x1: gx - own.actualBoundingBoxLeft, y1: baseline - own.actualBoundingBoxAscent, x2: gx + own.actualBoundingBoxRight, y2: baseline + own.actualBoundingBoxDescent },
      }
      const kept = prev[glyphs.length]
      glyphs.push({
        ...base,
        offset: kept && kept.char === char ? kept.offset : { x: 0, y: 0 },
        velocity: { x: 0, y: 0 }, outline: 0,
        fill: sprite(base, v, false, ink), dashes: sprite(base, v, true, ink),
      })
    })
    drag = -1; frame.i = -1
    return v
  }

  function glyphAt(x: number, y: number) {
    if (!view || y < view.top - 24 || y > view.bottom + 24) return -1
    let best = -1, bd = Infinity
    glyphs.forEach((g, i) => {
      const x1 = g.box.x1 + g.offset.x, x2 = g.box.x2 + g.offset.x
      const d = x < x1 ? x1 - x : x > x2 ? x - x2 : 0
      if (d < bd) { bd = d; best = i }
    })
    return bd < 28 ? best : -1
  }

  const blit = (a: Sprite, dx: number, dy: number) => ctx.drawImage(a.image, Math.round((a.left + dx) * dpr), Math.round((a.top + dy) * dpr))
  const crisp = (v: number) => (Math.round(v * dpr) + 0.5) / dpr

  function perimeter(d: number, w: number, h: number): [number, number, number, number] {
    const P = 2 * (w + h); d = ((d % P) + P) % P
    if (d < w) return [frame.x1 + d, frame.y1, 0, -1]
    d -= w; if (d < h) return [frame.x2, frame.y1 + d, 1, 0]
    d -= h; if (d < w) return [frame.x2 - d, frame.y2, 0, 1]
    d -= w; return [frame.x1, frame.y2 - d, -1, 0]
  }

  function drawFrame(accent: string) {
    const g = glyphs[frame.i]
    if (!g || frame.a < 0.01) return
    const a = frame.a, x1 = crisp(frame.x1), y1 = crisp(frame.y1), x2 = crisp(frame.x2), y2 = crisp(frame.y2)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = accent; ctx.strokeStyle = accent; ctx.lineWidth = 1
    ctx.globalAlpha = 0.5 * a; ctx.beginPath(); ctx.rect(x1, y1, x2 - x1, y2 - y1); ctx.stroke()
    ctx.globalAlpha = 0.95 * a; ctx.beginPath()
    for (const [cx, cy] of [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]) ctx.rect(Math.round(cx) - 2, Math.round(cy) - 2, 5, 5)
    ctx.fill()
    const w = frame.x2 - frame.x1, h = frame.y2 - frame.y1
    if (o.specks > 0 && w > 2 && h > 2) {
      const per = 2 * (w + h), seed = frame.i + 1
      for (let k = 0; k < o.specks; k++) {
        const period = 0.5 + noise(seed, k, 11) * 1.2, t = pulse / period + noise(seed, k, 17), cyc = Math.floor(t), life = t - cyc
        if (life > 0.7) continue
        const [px, py, nx, ny] = perimeter(noise(seed, k, cyc) * per, w, h)
        const pick = noise(seed, k, cyc, 2)
        const size = pick < 0.46 ? 2 : pick < 0.7 ? 3 : pick < 0.84 ? 5 : pick < 0.94 ? 8 : 11
        const out = (size >= 8 ? 9 : 4) + Math.floor(noise(seed, k, cyc, 1) * 5) * 3
        const x = frame.x1 + Math.round((px + nx * out - frame.x1) / 3) * 3, y = frame.y1 + Math.round((py + ny * out - frame.y1) / 3) * 3
        const tone = noise(seed, k, cyc, 3), blink = life < 0.06 || (life > 0.32 && life < 0.36) ? 0.35 : 1
        ctx.globalAlpha = a * (0.3 + 0.6 * tone) * blink
        const l = Math.round(x - size / 2), tp = Math.round(y - size / 2)
        if (tone < 0.26 || (size >= 8 && tone < 0.78)) ctx.strokeRect(l + 0.5, tp + 0.5, size, size)
        else ctx.fillRect(l, tp, size, size)
      }
      for (let j = 0; j < 2; j++) {
        const head = (pulse * 0.42 * o.speed + j * 0.5) * per
        for (let i = 0; i < 4; i++) {
          const [x, y] = perimeter(head - i * 6, w, h), s = i === 0 ? 3 : 2
          ctx.globalAlpha = a * [0.95, 0.55, 0.32, 0.16][i]
          ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s)
        }
      }
    }
    ctx.font = '10px "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.globalAlpha = 0.62 * a
    const moved = Math.hypot(g.offset.x, g.offset.y)
    const label = moved > 1
      ? `${Math.round(g.offset.x)}, ${Math.round(-g.offset.y)}`
      : `${g.char}  ${Math.round(g.box.x2 - g.box.x1)} × ${Math.round(g.box.y2 - g.box.y1)}`
    ctx.fillText(label, Math.round(frame.x1), Math.round(frame.y1) - 7)
    ctx.globalAlpha = 1
  }

  function kick(index: number) {
    const s = (view ? view.size : 120) * 11
    kicks.push({ i: index, at: pulse, v: s })
    for (let d = 1; d < glyphs.length; d++) {
      const v = s * Math.pow(0.62, d)
      if (v < 30) break
      for (const j of [index - d, index + d]) if (j >= 0 && j < glyphs.length) kicks.push({ i: j, at: pulse + d * 0.055, v })
    }
    wake()
  }

  function tick(now: number) {
    raf = 0
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now
    const cs = getComputedStyle(el), ink = cs.color || '#000'
    const v = layout(ink)
    const damping = 2 * Math.sqrt(SPRING) * (1 - Math.min(1, o.bounce) * 0.96)
    const sweeping = o.sweep && !reduced && !ptr.inside && drag < 0
    if (sweeping) clock += dt * o.speed
    pulse += dt
    let tx = ptr.x, ty = ptr.y
    if (sweeping) {
      tx = v.left + (v.right - v.left) * (0.5 - 0.5 * Math.cos(clock * 0.45))
      ty = v.top + (v.bottom - v.top) * (0.45 + 0.1 * Math.sin(clock * 0.8))
    }
    const active = ptr.inside || sweeping || drag >= 0
    if (active && !placed) { lens.x = tx; lens.y = ty }
    if (active) { const lag = ptr.inside ? 0.05 : 0.22; lens.x = approach(lens.x, tx, dt, lag); lens.y = approach(lens.y, ty, dt, lag) }
    placed = active

    for (let k = kicks.length - 1; k >= 0; k--) {
      if (kicks[k].at > pulse) continue
      const g = glyphs[kicks[k].i]; if (g) g.velocity.y -= kicks[k].v
      kicks.splice(k, 1)
    }
    let moving = false
    glyphs.forEach((g, i) => {
      if (i === drag) {
        g.offset.x = approach(g.offset.x, ptr.x - grab.x, dt, 0.03); g.offset.y = approach(g.offset.y, ptr.y - grab.y, dt, 0.03)
        g.velocity.x = 0; g.velocity.y = 0; moving = true; return
      }
      const { offset: f, velocity: s } = g
      if (Math.abs(f.x) < 0.05 && Math.abs(f.y) < 0.05 && Math.hypot(s.x, s.y) < 0.5) { f.x = f.y = s.x = s.y = 0; return }
      s.x += (-SPRING * f.x - damping * s.x) * dt; s.y += (-SPRING * f.y - damping * s.y) * dt
      f.x += s.x * dt; f.y += s.y * dt; moving = true
    })

    const focus = drag >= 0 ? drag : active ? glyphAt(lens.x, lens.y) : -1
    if (focus >= 0) {
      const g = glyphs[focus]
      const b = [g.box.x1 + g.offset.x - 6, g.box.y1 + g.offset.y - 6, g.box.x2 + g.offset.x + 6, g.box.y2 + g.offset.y + 6]
      if (frame.i < 0 || frame.a < 0.02) { frame.x1 = b[0]; frame.y1 = b[1]; frame.x2 = b[2]; frame.y2 = b[3] }
      const gl = focus === drag ? 0.02 : 0.08
      frame.x1 = approach(frame.x1, b[0], dt, gl); frame.y1 = approach(frame.y1, b[1], dt, gl)
      frame.x2 = approach(frame.x2, b[2], dt, gl); frame.y2 = approach(frame.y2, b[3], dt, gl)
      frame.i = focus
    }
    frame.a = approach(frame.a, focus >= 0 ? 1 : 0, dt, 0.1)
    glyphs.forEach((g, i) => {
      const target = i === focus && i !== drag ? 1 : 0
      g.outline = approach(g.outline, target, dt, 0.09)
      if (Math.abs(g.outline - target) > 0.002) moving = true
      else g.outline = target
    })

    const nc = drag >= 0 ? 'grabbing' : focus >= 0 && ptr.inside ? 'grab' : ''
    if (nc !== cursor) { cursor = nc; el.style.cursor = nc }

    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, cv.width, cv.height)
    for (const g of glyphs) {
      const m = Math.hypot(g.offset.x, g.offset.y)
      if (m > 1) { ctx.globalAlpha = Math.min(1, m / 24) * 0.55; blit(g.dashes, 0, 0); ctx.globalAlpha = 1 }
    }
    glyphs.forEach((g) => {
      if (g.outline < 0.999) { ctx.globalAlpha = 1 - g.outline; blit(g.fill, g.offset.x, g.offset.y) }
      if (g.outline > 0.001) { ctx.globalAlpha = g.outline; blit(g.dashes, g.offset.x, g.offset.y) }
      ctx.globalAlpha = 1
    })
    drawFrame(cs.color)
    const settling = moving || kicks.length > 0 || (frame.a > 0.01 && frame.a < 0.99)
    if ((active || settling) && vis) raf = requestAnimationFrame(tick)
  }

  const resize = () => {
    W = Math.max(1, el.clientWidth); H = Math.max(1, el.clientHeight)
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr)
    refresh()
  }
  const locate = (e: PointerEvent) => { const r = el.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top }
  const onMove = (e: PointerEvent) => { locate(e); ptr.inside = true; wake() }
  const onLeave = () => { if (drag >= 0) return; ptr.inside = false; wake() }
  const onDown = (e: PointerEvent) => {
    locate(e); ptr.inside = true
    const i = e.pointerType !== 'mouse' || e.button === 0 ? glyphAt(ptr.x, ptr.y) : -1
    press.x = ptr.x; press.y = ptr.y; press.t = performance.now(); press.i = i
    if (i >= 0) { drag = i; grab.x = ptr.x - glyphs[i].offset.x; grab.y = ptr.y - glyphs[i].offset.y; el.setPointerCapture?.(e.pointerId) }
    wake()
  }
  const onUp = (e: PointerEvent) => {
    if (drag >= 0) {
      drag = -1; el.releasePointerCapture?.(e.pointerId)
      const r = el.getBoundingClientRect()
      ptr.inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
    }
    if (e.type === 'pointerup' && press.i >= 0 && o.kick && !reduced && performance.now() - press.t < 450) {
      const r = el.getBoundingClientRect()
      if (Math.hypot(e.clientX - r.left - press.x, e.clientY - r.top - press.y) < 6) kick(press.i)
    }
    press.i = -1; wake()
  }
  const opts = { passive: true } as const
  el.addEventListener('pointermove', onMove, opts)
  el.addEventListener('pointerenter', onMove, opts)
  el.addEventListener('pointerleave', onLeave, opts)
  el.addEventListener('pointerdown', onDown, opts)
  el.addEventListener('pointerup', onUp, opts)
  el.addEventListener('pointercancel', onUp, opts)
  const ro = new ResizeObserver(resize)
  ro.observe(el)
  const io = new IntersectionObserver(([en]) => { vis = en.isIntersecting; wake() })
  io.observe(el)
  document.fonts?.ready.then(refresh, refresh)
  resize()

  return () => {
    disposed = true
    cancelAnimationFrame(raf)
    ro.disconnect(); io.disconnect()
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerenter', onMove)
    el.removeEventListener('pointerleave', onLeave)
    el.removeEventListener('pointerdown', onDown)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onUp)
    cv.remove()
  }
}

export function TechText({ className = '', ...options }: Options & { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { text, weight, size, specks } = options

  useEffect(() => {
    if (!ref.current) return
    return mountTechText(ref.current, { text, weight, size, specks })
  }, [text, weight, size, specks])

  return <div ref={ref} role="img" aria-label={text} className={`relative touch-pan-y select-none ${className}`} />
}
