import { createPrecipitation } from './precipitation.js'
import { currentQuality, watchQuality } from './quality.js'
import { createRenderer } from './renderer.js'
import { createSky } from './sky.js'

let api = null
let mounted = false

export function ensureSky() {
  if (mounted) return
  const container = document.querySelector('#viewport')
  if (!container) return
  try {
    mountScene()
    mounted = true
    container.querySelector('[data-sky-error]')?.remove()
  } catch {
    if (!container.querySelector('[data-sky-error]')) {
      const note = document.createElement('p')
      note.dataset.skyError = ''
      note.className = 'flex h-full items-center justify-center px-6 text-center text-sm text-[#b7c0d0]'
      note.textContent = 'Le ciel 3D n’a pas pu démarrer.'
      container.append(note)
    }
  }
}

export function mountScene() {
  const container = document.querySelector('#viewport')
  const view = createRenderer(container)
  const sky = createSky(view.scene)
  const precipitation = createPrecipitation(view.scene)
  const applyQuality = (quality) => {
    view.setQuality(quality)
    precipitation.setQuality(quality)
  }
  applyQuality(currentQuality())
  watchQuality(applyQuality)
  view.onFrame((delta) => {
    sky.tick(delta)
    precipitation.update(delta)
  })
  view.start()
  api = { sky, precipitation }
}

export function updateScene(forecast) {
  if (!api || !forecast?.current) return
  api.sky.setForecast(forecast)
  api.precipitation.setForecast(forecast)
}
