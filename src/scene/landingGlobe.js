import { mountEarth } from './globe.js'

let landingEarth = null

export function mountLandingGlobe(container) {
  landingEarth = mountEarth(container, { cameraZ: 3.45, idleSpeed: 0.12, initialYaw: (250 * Math.PI) / 180 })
  landingEarth.start()
}

export function ensureLandingGlobe(container) {
  if (!landingEarth) {
    mountLandingGlobe(container)
    return
  }
  landingEarth.start()
}

export function disposeLandingGlobe() {
  landingEarth?.dispose()
  landingEarth = null
}
