import * as THREE from 'three'
import { weatherCodeToState } from '../lib/weatherCodes.js'
import { currentQuality } from './quality.js'

const RAIN_MAX = 520
const SNOW_MAX = 240
const GUST_MAX = 40

const up = new THREE.Vector3(0, 1, 0)
const fall = new THREE.Vector3()
const gustAxis = new THREE.Vector3(1, 0, 0)
const dummy = new THREE.Object3D()

function resetDrop(item, top) {
  item.x = (Math.random() - 0.5) * 14
  item.y = top
  item.z = -8 - Math.random() * 34
}

function makeField(count, top) {
  return Array.from({ length: count }, () => {
    const item = { x: 0, y: 0, z: 0, speed: 0.7 + Math.random() * 0.6 }
    resetDrop(item, Math.random() * top)
    return item
  })
}

export function createPrecipitation(scene) {
  const rainMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying float vAlong;
      void main() {
        vAlong = position.y;
        vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      varying float vAlong;
      void main() {
        float fade = smoothstep(0.78, 0.05, abs(vAlong));
        gl_FragColor = vec4(0.72, 0.82, 1.0, 0.55 * fade);
      }
    `,
  })
  const rain = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.012, 1.55, 5), rainMat, RAIN_MAX)
  rain.count = 0
  rain.frustumCulled = false
  scene.add(rain)

  const snowMat = new THREE.MeshBasicMaterial({
    color: 0xf7fbff,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  })
  const snow = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.12, 0), snowMat, SNOW_MAX)
  snow.count = 0
  snow.frustumCulled = false
  scene.add(snow)

  const gustMat = new THREE.MeshBasicMaterial({
    color: 0xd7e2f0,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const gusts = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.02, 0.02), gustMat, GUST_MAX)
  gusts.count = 0
  gusts.frustumCulled = false
  scene.add(gusts)

  const drops = makeField(RAIN_MAX, 16)
  const flakes = makeField(SNOW_MAX, 14)
  const gustItems = makeField(GUST_MAX, 8)
  const wind = new THREE.Vector3()
  let mode = 'none'
  let clock = 0
  let quality = currentQuality()

  function caps() {
    if (quality === 'low') {
      return { rain: Math.round(RAIN_MAX / 3), snow: Math.round(SNOW_MAX / 3) }
    }
    return { rain: RAIN_MAX, snow: SNOW_MAX }
  }

  function applyCounts() {
    const cap = caps()
    rain.count = mode === 'rain' ? cap.rain : mode === 'drizzle' ? Math.round(cap.rain * 0.34) : 0
    snow.count = mode === 'snow' ? cap.snow : 0
  }

  scene.fog = new THREE.FogExp2(0xb7c3d1, 0)

  function setForecast(forecast) {
    const current = forecast?.current ?? {}
    const state = weatherCodeToState(current.weather_code)
    const speed = Math.min(Number(current.wind_speed_10m ?? 0), 80) / 40
    const from = THREE.MathUtils.degToRad(Number(current.wind_direction_10m ?? 0))
    wind.set(-Math.sin(from) * speed, 0, -Math.cos(from) * speed)

    if (state === 'snow') mode = 'snow'
    else if (state === 'drizzle') mode = 'drizzle'
    else if (state === 'rain' || state === 'thunder') mode = 'rain'
    else mode = 'none'

    applyCounts()
    gusts.count = mode === 'none' && wind.length() > 0.35 ? GUST_MAX : 0
    scene.fog.density = state === 'fog' ? 0.07 : mode === 'rain' ? 0.01 : state === 'snow' ? 0.016 : 0
  }

  function wrap(item, top) {
    if (item.y < 0.15 || Math.abs(item.x) > 12 || item.z > -4 || item.z < -46) {
      resetDrop(item, top)
    }
  }

  return {
    setForecast,
    setQuality(next) {
      quality = next === 'low' ? 'low' : 'high'
      applyCounts()
    },
    update(delta) {
      clock += delta
      if (rain.count > 0) {
        const lean = mode === 'drizzle' ? 0.45 : 1
        for (let i = 0; i < rain.count; i += 1) {
          const item = drops[i]
          const fallSpeed = (mode === 'drizzle' ? 7 : 14) * item.speed
          item.y -= fallSpeed * delta
          item.x += wind.x * fallSpeed * delta
          item.z += wind.z * fallSpeed * delta
          wrap(item, 16)
          fall.set(wind.x * lean, -1, wind.z * lean).normalize()
          dummy.position.set(item.x, item.y, item.z)
          dummy.quaternion.setFromUnitVectors(up, fall)
          dummy.scale.set(1, mode === 'drizzle' ? 0.4 : 0.85 + item.speed * 0.35, 1)
          dummy.updateMatrix()
          rain.setMatrixAt(i, dummy.matrix)
        }
        rain.instanceMatrix.needsUpdate = true
      }
      if (snow.count > 0) {
        for (let i = 0; i < snow.count; i += 1) {
          const item = flakes[i]
          const sway = Math.sin(clock * 1.3 + i) * 0.25
          item.y -= 1.5 * item.speed * delta
          item.x += (wind.x * 1.4 + sway) * delta
          item.z += wind.z * 1.4 * delta
          wrap(item, 14)
          fall.set(wind.x * 0.85, -1, wind.z * 0.85).normalize()
          dummy.position.set(item.x, item.y, item.z)
          dummy.quaternion.setFromUnitVectors(up, fall)
          dummy.scale.setScalar(0.55 + (i % 5) * 0.16)
          dummy.updateMatrix()
          snow.setMatrixAt(i, dummy.matrix)
        }
        snow.instanceMatrix.needsUpdate = true
      }
      if (gusts.count > 0) {
        const dir = wind.clone().normalize()
        for (let i = 0; i < gusts.count; i += 1) {
          const item = gustItems[i]
          item.x += dir.x * (6 + item.speed * 4) * delta
          item.z += dir.z * (6 + item.speed * 4) * delta
          item.y = 1.2 + (i % 7) * 0.7 + Math.sin(clock * 2 + i) * 0.15
          wrap(item, item.y)
          if (item.z > 8 || item.z < -50 || Math.abs(item.x) > 12) resetDrop(item, item.y)
          dummy.position.set(item.x, item.y, item.z)
          dummy.quaternion.setFromUnitVectors(gustAxis, dir)
          dummy.scale.set(0.7 + item.speed, 1, 1)
          dummy.updateMatrix()
          gusts.setMatrixAt(i, dummy.matrix)
        }
        gusts.instanceMatrix.needsUpdate = true
      }
    },
  }
}
