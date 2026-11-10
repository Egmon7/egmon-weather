import { mountGlobe, startGlobe, stopGlobe } from '../scene/globe.js'
import { disposeLandingGlobe, ensureLandingGlobe, mountLandingGlobe } from '../scene/landingGlobe.js'
import { loadFavorites, loadRecent, selectPlace, setView } from '../state/store.js'
import { mountSearch } from './search.js'

let appReady = false

function random(seed) {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

function mountStars(canvas) {
  const stars = []
  const rand = random(42)
  for (let index = 0; index < 90; index += 1) {
    stars.push({
      x: rand(),
      y: rand(),
      radius: rand() < 0.08 ? 1.6 + rand() * 1.4 : 0.4 + rand() * 0.8,
      spark: rand() < 0.12,
      gold: rand() < 0.18,
      phase: rand() * Math.PI * 2,
    })
  }

  let running = false
  let width = 0
  let height = 0

  function draw(time) {
    const nextWidth = window.innerWidth
    const nextHeight = window.innerHeight
    const ratio = Math.min(window.devicePixelRatio, 2)
    if (width !== nextWidth || height !== nextHeight) {
      width = nextWidth
      height = nextHeight
      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
    }
    const context = canvas.getContext('2d')
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, width, height)

    for (const star of stars) {
      const alpha = 0.35 + (Math.sin(time / 900 + star.phase) * 0.5 + 0.5) * 0.65
      const x = star.x * width
      const y = star.y * height
      context.globalAlpha = alpha
      context.fillStyle = star.gold ? '#d9b780' : '#f4f7ff'
      context.beginPath()
      context.arc(x, y, star.radius, 0, Math.PI * 2)
      context.fill()
      if (!star.spark) continue
      context.strokeStyle = star.gold ? '#d9b780' : '#f4f7ff'
      context.lineWidth = 1
      const arm = star.radius * 5
      context.beginPath()
      context.moveTo(x - arm, y)
      context.lineTo(x + arm, y)
      context.moveTo(x, y - arm)
      context.lineTo(x, y + arm)
      context.stroke()
    }
    context.globalAlpha = 1
  }

  function tick(time) {
    if (!running) return
    requestAnimationFrame(tick)
    draw(time)
  }

  return {
    start() {
      if (running) return
      running = true
      requestAnimationFrame(tick)
    },
    stop() {
      running = false
    },
  }
}

export function mountLanding() {
  const stars = mountStars(document.querySelector('#landing-stars'))
  mountLandingGlobe(document.querySelector('#landing-globe'))
  stars.start()

  const showLanding = () => {
    document.querySelector('#landing').classList.remove('hidden')
    document.querySelector('#app').classList.add('hidden')
    stars.start()
    ensureLandingGlobe(document.querySelector('#landing-globe'))
    stopGlobe()
  }

  const openApp = () => {
    document.querySelector('#landing').classList.add('hidden')
    document.querySelector('#app').classList.remove('hidden')
    stars.stop()
    disposeLandingGlobe()
    if (!appReady) {
      appReady = true
      mountGlobe(document.querySelector('#app-globe'), {
        onSelect: (place) => selectPlace(place),
        onFlyDone: () => setView('sky'),
      })
      mountSearch()
      loadRecent()
      loadFavorites()
    } else {
      startGlobe()
    }
    window.dispatchEvent(new Event('resize'))
  }

  for (const button of document.querySelectorAll('[data-open-app]')) {
    button.addEventListener('click', openApp)
  }
  document.querySelector('#back-home').addEventListener('click', showLanding)
}
