import * as THREE from 'three'

export const RAIN_MAX = 700
export const SNOW_MAX = 450

const WET = new Set(['drizzle', 'rain', 'thunder'])

const pointVertex = `
  uniform float uSize;
  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * view;
    gl_PointSize = uSize;
  }
`

function pointMaterial(fragmentShader, size) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: { uSize: { value: size } },
    vertexShader: pointVertex,
    fragmentShader,
  })
}

const rainMaterial = () => pointMaterial(`
  void main() {
    if (abs(gl_PointCoord.x - 0.5) > 0.08) discard;
    float alpha = smoothstep(0.0, 0.45, gl_PointCoord.y);
    gl_FragColor = vec4(0.82, 0.90, 1.0, alpha * 0.7);
  }
`, 34)

const snowMaterial = () => pointMaterial(`
  void main() {
    float dist = distance(gl_PointCoord, vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.05, dist);
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * 0.9);
  }
`, 12)

function scatter(count) {
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count)
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 40
    positions[index * 3 + 1] = 2 + Math.random() * 22
    positions[index * 3 + 2] = -6 - Math.random() * 36
    velocities[index] = 0.65 + Math.random() * 0.7
  }
  return { positions, velocities }
}

function createPoints(count, material) {
  const { positions, velocities } = scatter(count)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setDrawRange(0, 0)

  const mesh = new THREE.Points(geometry, material)
  mesh.visible = false
  mesh.frustumCulled = false
  return { mesh, velocities }
}

function fall(entry, speed, delta) {
  if (!entry.mesh.visible) return
  const position = entry.mesh.geometry.attributes.position
  const array = position.array
  const count = entry.mesh.geometry.drawRange.count
  for (let index = 0; index < count; index += 1) {
    const y = index * 3 + 1
    array[y] -= entry.velocities[index] * speed * delta
    if (array[y] < 1.5) array[y] = 24
  }
  position.needsUpdate = true
}

export function createPrecipitation(scene) {
  const rain = createPoints(RAIN_MAX, rainMaterial())
  const snow = createPoints(SNOW_MAX, snowMaterial())
  scene.add(rain.mesh, snow.mesh)

  function spawnRain(count) {
    const next = Math.min(Math.max(0, count), RAIN_MAX)
    rain.mesh.geometry.setDrawRange(0, next)
    rain.mesh.visible = next > 0
    snow.mesh.visible = false
  }

  function spawnSnow(count) {
    const next = Math.min(Math.max(0, count), SNOW_MAX)
    snow.mesh.geometry.setDrawRange(0, next)
    snow.mesh.visible = next > 0
    rain.mesh.visible = false
  }

  function hide() {
    rain.mesh.visible = false
    snow.mesh.visible = false
  }

  return {
    spawnRain,
    spawnSnow,
    setState(weatherState) {
      if (weatherState === 'drizzle') spawnRain(Math.round(RAIN_MAX * 0.4))
      else if (weatherState === 'rain' || weatherState === 'thunder') spawnRain(RAIN_MAX)
      else if (weatherState === 'snow') spawnSnow(SNOW_MAX)
      else if (weatherState === 'clear' || weatherState === 'cloudy' || weatherState === 'fog' || !WET.has(weatherState)) hide()
    },
    update(delta) {
      fall(rain, 14, delta)
      fall(snow, 2.2, delta)
    },
  }
}
