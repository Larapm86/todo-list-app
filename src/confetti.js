import { CONFETTI_COLORS } from './constants.js'
import { CELEBRATION_DURATION_MS } from './constants.js'
import { appEl } from './dom.js'

/** Single confetti burst from origin (e.g. on todo complete). */
export function runConfettiBurst(originX, originY, durationMs = 2200) {
  const canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }
  const particles = []
  const count = 70
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
    const speed = 2 + Math.random() * 5
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: Math.random() * 6 + 4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * 360,
      spin: (Math.random() - 0.5) * 0.2,
    })
  }
  const startTime = performance.now()
  const stopAt = startTime + durationMs
  const fadeStart = stopAt - 400

  function tick(now) {
    if (now >= stopAt) {
      canvas.remove()
      return
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.12
      p.rotation += p.spin
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.fillStyle = p.color
      if (now > fadeStart) ctx.globalAlpha = (stopAt - now) / 400
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
      ctx.restore()
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

/** Show confetti at rect center (e.g. checkbox). */
export function showConfetti(originRect) {
  const centerX = originRect
    ? originRect.left + originRect.width / 2
    : window.innerWidth / 2
  const centerY = originRect
    ? originRect.top + originRect.height / 2
    : window.innerHeight * 0.3
  runConfettiBurst(centerX, centerY, 2200)
}

/** Full empty-state party: confetti + app--party class for 3s. */
export function runEmptyStateCelebration() {
  if (!appEl) return
  appEl.classList.add('app--party')
  const stopAt = performance.now() + CELEBRATION_DURATION_MS

  const canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    appEl.classList.remove('app--party')
    return
  }

  let particles = []
  const centerX = canvas.width / 2
  const centerY = canvas.height * 0.35

  function addBurst(originX, originY) {
    const count = 80
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 2 + Math.random() * 5
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: Math.random() * 6 + 4,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 0.2,
      })
    }
  }
  addBurst(centerX, centerY)
  const secondBurstAt = performance.now() + 1200
  let secondBurstDone = false

  function tick(now) {
    if (now >= stopAt) {
      canvas.remove()
      appEl.classList.remove('app--party')
      return
    }
    if (!secondBurstDone && now >= secondBurstAt) {
      secondBurstDone = true
      addBurst(centerX * 0.6, centerY)
      addBurst(centerX * 1.4, centerY)
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.12
      p.rotation += p.spin
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.fillStyle = p.color
      const fadeStart = stopAt - 500
      if (now > fadeStart) ctx.globalAlpha = (stopAt - now) / 500
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
      ctx.restore()
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
