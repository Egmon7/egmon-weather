import * as THREE from 'three'

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x07101c, 1)
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  container.append(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500)
  camera.position.set(0, 1.4, 10)
  camera.lookAt(0, 18, -28)

  const clock = new THREE.Clock()
  const updaters = []
  let running = false

  function resize() {
    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  function frame() {
    if (!running) return
    requestAnimationFrame(frame)
    if (document.visibilityState === 'hidden') {
      clock.getDelta()
      return
    }
    const delta = Math.min(clock.getDelta(), 0.05)
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
    start() {
      if (running) return
      running = true
      frame()
    },
    resize,
  }
}
