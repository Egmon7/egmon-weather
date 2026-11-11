import * as THREE from 'three'

const BUILDINGS = 36
const TREES = 12

function mix32(seed) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function seedOf(place) {
  const text = `${place?.name ?? ''}|${Number(place?.latitude ?? 0).toFixed(2)}|${Number(place?.longitude ?? 0).toFixed(2)}`
  let hash = 2166136261
  for (const char of text) {
    hash ^= char.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function climateOf(latitude) {
  const abs = Math.abs(Number(latitude) || 0)
  if (abs < 18) return 'tropical'
  if (abs < 40) return 'temperate'
  if (abs < 58) return 'continental'
  return 'polar'
}

const PALETTES = {
  tropical: { wall: '#e4c98a', window: '#fff1c2', ground: 0x3f7a49, groundNight: 0x173024, road: 0x6a5b45, tree: 0x2f8f45 },
  temperate: { wall: '#d5dde6', window: '#fff4d8', ground: 0x5b6b52, groundNight: 0x151c28, road: 0x4e5864, tree: 0x3d6b42 },
  continental: { wall: '#c9c2b6', window: '#f3e7c8', ground: 0x55624c, groundNight: 0x141a22, road: 0x5a534c, tree: 0x2f5a38 },
  polar: { wall: '#e7eef5', window: '#d5e4f5', ground: 0xd5dee8, groundNight: 0x1a2433, road: 0x8d97a3, tree: 0xc5d0c8 },
}

function facadeTexture(palette, rand) {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 128
  const pen = canvas.getContext('2d')
  pen.fillStyle = palette.wall
  pen.fillRect(0, 0, 64, 128)
  for (let y = 8; y < 122; y += 14) {
    for (let x = 5; x < 58; x += 12) {
      pen.fillStyle = rand() > 0.35 ? palette.window : '#243044'
      pen.fillRect(x, y, 7, 9)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function signTexture(label) {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 160
  const pen = canvas.getContext('2d')
  pen.fillStyle = '#171d2e'
  pen.fillRect(0, 0, 640, 160)
  pen.strokeStyle = '#d9b780'
  pen.lineWidth = 8
  pen.strokeRect(8, 8, 624, 144)
  pen.fillStyle = '#f4f7ff'
  pen.font = '600 64px Inter, sans-serif'
  pen.textAlign = 'center'
  pen.textBaseline = 'middle'
  const text = label.length > 18 ? `${label.slice(0, 17)}…` : label
  pen.fillText(text, 320, 80)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function createCity(scene) {
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x5b6b52, roughness: 1 })
  const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 40), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.04
  scene.add(ground)

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x4e5864, roughness: 0.55, metalness: 0.08 })
  const road = new THREE.Mesh(new THREE.PlaneGeometry(9, 78), roadMat)
  road.rotation.x = -Math.PI / 2
  road.position.set(0, 0, -16)
  scene.add(road)

  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd9b780 })
  for (let z = 6; z > -50; z -= 3.4) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.15), dashMat)
    dash.rotation.x = -Math.PI / 2
    dash.position.set(0, 0.015, z)
    scene.add(dash)
  }

  let facade = facadeTexture(PALETTES.temperate, mix32(1))
  const buildingMat = new THREE.MeshStandardMaterial({
    map: facade,
    roughness: 0.74,
    metalness: 0.05,
    emissive: new THREE.Color('#ffe6bf'),
    emissiveMap: facade,
    emissiveIntensity: 0.08,
  })
  const buildings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), buildingMat, BUILDINGS)
  buildings.count = 0
  scene.add(buildings)

  const capMat = new THREE.MeshStandardMaterial({ color: 0xf7fbff, roughness: 0.9 })
  const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), capMat, BUILDINGS)
  caps.count = 0
  scene.add(caps)

  const treeMat = new THREE.MeshStandardMaterial({ color: 0x3d6b42, roughness: 0.85 })
  const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(0.55, 1.8, 6), treeMat, TREES)
  trees.count = 0
  scene.add(trees)

  const signMat = new THREE.MeshBasicMaterial({ map: signTexture('Ville'), transparent: true })
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.6), signMat)
  sign.position.set(0, 3.05, 3.5)
  scene.add(sign)

  const lamps = []
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe1a8 })
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x8d96a3, roughness: 0.55 })
  for (let z = 4; z > -46; z -= 10) {
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.5, 6), poleMat)
      pole.position.set(side * 4.15, 1.25, z)
      scene.add(pole)
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), bulbMat)
      bulb.position.set(side * 4.15, 2.55, z)
      scene.add(bulb)
      const light = new THREE.PointLight(0xffe1a8, 0, 10, 2)
      light.position.copy(bulb.position)
      scene.add(light)
      lamps.push(light)
    }
  }

  const dummy = new THREE.Object3D()
  const blocks = []
  let palette = PALETTES.temperate
  let placed = ''

  function writeBlocks(mesh, snowy) {
    blocks.forEach((block, index) => {
      dummy.position.set(block.x, block.height / 2, block.z)
      dummy.scale.set(block.width, block.height, block.depth)
      dummy.rotation.set(0, block.yaw, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
      dummy.position.set(block.x, block.height + 0.08, block.z)
      dummy.scale.set(block.width * 1.04, snowy ? 0.22 : 0.001, block.depth * 1.04)
      dummy.updateMatrix()
      caps.setMatrixAt(index, dummy.matrix)
    })
    mesh.count = blocks.length
    caps.count = blocks.length
    mesh.instanceMatrix.needsUpdate = true
    caps.instanceMatrix.needsUpdate = true
  }

  function layout(place) {
    const key = `${place?.id ?? ''}|${place?.latitude ?? ''}|${place?.longitude ?? ''}`
    if (key === placed) return
    placed = key
    const climate = climateOf(place?.latitude)
    palette = PALETTES[climate]
    const rand = mix32(seedOf(place))
    blocks.length = 0
    const gap = climate === 'tropical' ? 4.2 : climate === 'polar' ? 6.2 : 4.8
    const tall = climate === 'continental' ? 12 : climate === 'polar' ? 4.5 : climate === 'tropical' ? 7 : 10
    for (const side of [-1, 1]) {
      for (let z = 5; blocks.length < BUILDINGS && z > -48; z -= gap) {
        const height = (climate === 'polar' ? 1.4 : 2.1) + rand() ** 0.7 * tall
        const width = 2.1 + rand() * (climate === 'tropical' ? 2.2 : 1.5)
        const depth = 2 + rand() * 1.8
        blocks.push({
          x: side * (6.2 + width * 0.25 + rand() * 0.8),
          z,
          height,
          width,
          depth,
          yaw: side > 0 ? rand() * 0.08 : Math.PI,
        })
      }
    }
    writeBlocks(buildings, false)
    let treeCount = 0
    for (let index = 0; index < TREES; index += 1) {
      const side = index % 2 === 0 ? -1 : 1
      dummy.position.set(side * (4.8 + rand()), 0.9, 4 - index * 3.6)
      dummy.scale.setScalar(climate === 'polar' ? 0.45 : 0.8 + rand() * 0.5)
      dummy.rotation.set(0, rand() * Math.PI, 0)
      dummy.updateMatrix()
      trees.setMatrixAt(index, dummy.matrix)
      treeCount += 1
    }
    trees.count = treeCount
    trees.instanceMatrix.needsUpdate = true
    treeMat.color.set(palette.tree)
    facade.dispose()
    buildingMat.map?.dispose()
    buildingMat.emissiveMap?.dispose()
    facade = facadeTexture(palette, rand)
    buildingMat.map = facade
    buildingMat.emissiveMap = facade
    buildingMat.needsUpdate = true
    const label = place?.name || (place ? `${Number(place.latitude).toFixed(2)}, ${Number(place.longitude).toFixed(2)}` : 'Ville')
    const nextSign = signTexture(label)
    signMat.map?.dispose()
    signMat.map = nextSign
    signMat.needsUpdate = true
  }

  layout(null)

  return {
    setPlace(place) {
      layout(place)
    },
    setWeather({ dayFactor, state }) {
      const night = dayFactor < 0.4
      const wet = state === 'rain' || state === 'drizzle' || state === 'thunder'
      const snow = state === 'snow'
      const fog = state === 'fog'
      const storm = state === 'thunder'
      buildingMat.color.set(snow ? 0xf4f7fb : night ? 0x1a2230 : storm ? 0x9aa3ae : palette.wall)
      buildingMat.emissiveIntensity = night ? 0.9 : fog ? 0.02 : 0.04
      for (const light of lamps) light.intensity = night || storm ? (storm && !night ? 0.6 : 2.4) : 0
      roadMat.roughness = wet ? 0.28 : 0.7
      roadMat.metalness = wet ? 0.18 : 0.02
      roadMat.color.set(snow ? 0xd5dde6 : wet ? 0x5c6570 : palette.road)
      if (snow) groundMat.color.set(0xf3f7fb)
      else if (fog) groundMat.color.set(0xb7c0c8)
      else if (night) groundMat.color.set(palette.groundNight)
      else groundMat.color.set(palette.ground)
      treeMat.color.set(snow ? 0xeef3f6 : fog ? 0x8d98a0 : palette.tree)
      capMat.color.set(snow ? 0xf7fbff : 0xf7fbff)
      writeBlocks(buildings, snow)
      sign.visible = !fog
    },
  }
}
