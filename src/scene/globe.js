import * as THREE from 'three'

const CAMERA_DIR = new THREE.Vector3(0, 0, 1)

function earthTextureUrl() {
  const base = import.meta.env && import.meta.env.BASE_URL
  if (base) return `${base}textures/earth.jpg`
  return new URL('../../public/textures/earth.jpg', import.meta.url).href
}

export function latLonToVector3(lat, lon, radius = 1) {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lon + 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

export function mountEarth(container, { cameraZ = 3.45, zoomZ = null, idleSpeed = 0.12, initialYaw = 0.55, onSelect = null, onFlyDone = null } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.display = 'block'
  container.append(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20)
  const restPosition = new THREE.Vector3(0.15, 0.05, cameraZ)
  const targetPosition = restPosition.clone()
  camera.position.copy(restPosition)

  const globe = new THREE.Group()
  globe.rotation.y = initialYaw
  scene.add(globe)

  const material = new THREE.MeshStandardMaterial({
    color: 0x8eb4d6,
    roughness: 0.9,
    metalness: 0,
  })
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), material))
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.08, 64, 64),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      toneMapped: false,
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float rim = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.4);
          gl_FragColor = vec4(0.55, 0.72, 1.0, rim);
        }
      `,
    }),
  ))

  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 18, 18),
    new THREE.MeshBasicMaterial({ color: 0xd9b780 }),
  )
  marker.visible = false
  globe.add(marker)

  const favoriteMeshes = []
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  scene.add(new THREE.AmbientLight(0xd5e4f5, 1.15))
  const sun = new THREE.DirectionalLight(0xfff6e8, 3.2)
  sun.position.set(2.5, 1.4, 4)
  scene.add(sun)

  new THREE.TextureLoader().load(earthTextureUrl(), (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
    material.map = texture
    material.color.set(0xffffff)
    material.needsUpdate = true
  })

  function resize() {
    const width = container.clientWidth || 1
    const height = container.clientHeight || 1
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  let running = false
  let mode = 'spin'
  let targetQuat = null
  let flyNotified = false
  const clock = new THREE.Clock()

  function arrived() {
    if (mode !== 'aim' || flyNotified) return
    const aimed = !targetQuat || globe.quaternion.angleTo(targetQuat) < 0.02
    const zoomed = camera.position.distanceTo(targetPosition) < 0.06
    if (!aimed || !zoomed) return
    if (targetQuat) globe.quaternion.copy(targetQuat)
    mode = 'hold'
    flyNotified = true
    onFlyDone?.()
  }

  function frame() {
    if (!running) return
    requestAnimationFrame(frame)
    if (document.visibilityState === 'hidden') {
      clock.getDelta()
      return
    }
    const delta = Math.min(clock.getDelta(), 0.05)
    camera.position.lerp(targetPosition, 1 - Math.exp(-2.4 * delta))
    camera.lookAt(0, 0, 0)
    if (mode === 'spin') {
      globe.rotation.y += delta * idleSpeed
    } else if (mode === 'aim' && targetQuat) {
      globe.quaternion.slerp(targetQuat, 1 - Math.exp(-3.4 * delta))
      arrived()
    }
    renderer.render(scene, camera)
  }

  function onPointerDown(event) {
    if (!onSelect) return
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects([marker, ...favoriteMeshes], false)
    const place = hits.find((hit) => hit.object.userData.place)?.object.userData.place
    if (!place) return
    onSelect(place)
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('resize', resize)
  resize()

  return {
    start() {
      if (running) return
      running = true
      frame()
    },
    stop() {
      running = false
    },
    dispose() {
      running = false
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', resize)
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
    flyTo(lat, lon, place = null) {
      const point = latLonToVector3(lat, lon, 1)
      marker.position.copy(point).multiplyScalar(1.035)
      marker.visible = true
      marker.userData.place = place
      targetQuat = new THREE.Quaternion().setFromUnitVectors(point.clone().normalize(), CAMERA_DIR)
      if (zoomZ != null) targetPosition.set(0, 0, zoomZ)
      flyNotified = false
      mode = 'aim'
    },
    setFavorites(places) {
      for (const mesh of favoriteMeshes) globe.remove(mesh)
      favoriteMeshes.length = 0
      for (const place of places) {
        if (place.latitude == null || place.longitude == null) continue
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.018, 14, 14),
          new THREE.MeshBasicMaterial({ color: 0xf4f7ff }),
        )
        mesh.position.copy(latLonToVector3(place.latitude, place.longitude, 1.04))
        mesh.userData.place = place
        globe.add(mesh)
        favoriteMeshes.push(mesh)
      }
    },
  }
}

let appEarth = null

export function mountGlobe(container, hooks = {}) {
  appEarth = mountEarth(container, {
    cameraZ: 4.35,
    zoomZ: 2.15,
    idleSpeed: 0.18,
    initialYaw: 0.4,
    onSelect: hooks.onSelect,
    onFlyDone: hooks.onFlyDone,
  })
  appEarth.start()
}

export function flyTo(lat, lon, place = null) {
  appEarth?.flyTo(lat, lon, place)
}

export function setFavoriteMarkers(places) {
  appEarth?.setFavorites(places)
}

export function stopGlobe() {
  appEarth?.stop()
}

export function startGlobe() {
  appEarth?.start()
}
