import * as THREE from 'three'

function facadeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 128
  const pen = canvas.getContext('2d')
  pen.fillStyle = '#d5dde6'
  pen.fillRect(0, 0, 64, 128)
  for (let y = 8; y < 122; y += 14) {
    for (let x = 5; x < 58; x += 12) {
      pen.fillStyle = Math.random() > 0.35 ? '#fff4d8' : '#7f92a8'
      pen.fillRect(x, y, 7, 9)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export function createCity(scene) {
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a5a48, roughness: 1 })
  const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 40), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.04
  scene.add(ground)

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x343b44, roughness: 0.55, metalness: 0.08 })
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

  const facade = facadeTexture()
  const buildingMat = new THREE.MeshStandardMaterial({
    map: facade,
    roughness: 0.74,
    metalness: 0.05,
    emissive: new THREE.Color('#ffe6bf'),
    emissiveMap: facade,
    emissiveIntensity: 0.08,
  })
  const buildings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), buildingMat, 36)
  const dummy = new THREE.Object3D()
  let count = 0
  for (const side of [-1, 1]) {
    for (let z = 6; z > -48 && count < 36; z -= 4.8) {
      const height = 2.2 + Math.random() ** 0.65 * 10
      const width = 2.3 + Math.random() * 1.6
      const depth = 2.1 + Math.random() * 1.8
      dummy.position.set(side * (6.5 + width * 0.2), height / 2, z)
      dummy.scale.set(width, height, depth)
      dummy.rotation.y = side > 0 ? 0.04 : Math.PI
      dummy.updateMatrix()
      buildings.setMatrixAt(count, dummy.matrix)
      count += 1
    }
  }
  buildings.count = count
  buildings.instanceMatrix.needsUpdate = true
  scene.add(buildings)

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

  return {
    setWeather({ dayFactor, state }) {
      const night = dayFactor < 0.4
      const wet = state === 'rain' || state === 'drizzle' || state === 'thunder'
      buildingMat.color.set(night ? 0x1a2230 : 0xf4f7fb)
      buildingMat.emissiveIntensity = night ? 0.85 : 0
      for (const light of lamps) light.intensity = night ? 2.4 : 0
      roadMat.roughness = wet ? 0.42 : 0.7
      roadMat.metalness = wet ? 0.12 : 0.02
      roadMat.color.set(wet ? 0x6d7782 : 0x4e5864)
      if (state === 'snow') groundMat.color.set(0xd7e0e8)
      else if (night) groundMat.color.set(0x151c28)
      else if (wet) groundMat.color.set(0x314038)
      else groundMat.color.set(0x5b6b52)
    },
  }
}
