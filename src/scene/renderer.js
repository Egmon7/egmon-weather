import * as THREE from 'three'
import { currentQuality, maxPixelRatio } from './quality.js'

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setClearColor(0x07101c, 1)
  let quality = currentQuality()
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  container.append(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500)
  camera.position.set(0, 5.2, 16)
  camera.lookAt(0, 2.2, -6)

  const timer = new THREE.Timer()
  timer.connect(document)
  const updaters = []
  let running = false

  function applyRatio() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio(quality)))
  }

  function resize() {
    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight
    applyRatio()
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  function frame(now) {
    if (!running) return
    requestAnimationFrame(frame)
    timer.update(now)
    if (document.visibilityState === 'hidden') return
    const delta = Math.min(timer.getDelta(), 0.05)
    for (const update of updaters) update(delta)
    renderer.render(scene, camera)
  }

  window.addEventListener('resize', resize)
  resize()

  return {
    scene,
    camera,
    renderer,
    onFrame(update) {
      updaters.push(update)
    },
    setQuality(next) {
      quality = next === 'low' ? 'low' : 'high'
      resize()
    },
    start() {
      if (running) return
      running = true
      frame()
    },
    resize,
  }
}
