import * as THREE from 'three'
import { weatherCodeToState } from '../lib/weatherCodes.js'

const STATE_ID = {
  clear: 0,
  cloudy: 1,
  fog: 2,
  drizzle: 3,
  rain: 4,
  snow: 5,
  thunder: 6,
}

const TWILIGHT_MINUTES = 45

const vertexShader = `
  varying vec3 vDir;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vDir = world.xyz - cameraPosition;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const fragmentShader = `
  uniform float uDayFactor;
  uniform float uCloud;
  uniform float uState;
  varying vec3 vDir;

  void main() {
    vec3 dir = normalize(vDir);
    float height = smoothstep(-0.2, 0.85, dir.y);

    vec3 nightZenith = vec3(0.05, 0.08, 0.22);
    vec3 nightHorizon = vec3(0.35, 0.45, 0.70);
    vec3 dayZenith = vec3(0.10, 0.34, 0.82);
    vec3 dayHorizon = vec3(0.72, 0.84, 0.95);
    vec3 sunsetHorizon = vec3(0.96, 0.40, 0.18);

    vec3 nightCol = mix(nightHorizon, nightZenith, height);
    vec3 dayCol = mix(dayHorizon, dayZenith, pow(height, 0.7));
    vec3 col = mix(nightCol, dayCol, uDayFactor);

    float sunset = smoothstep(0.0, 0.22, uDayFactor) * (1.0 - smoothstep(0.42, 0.82, uDayFactor));
    col = mix(col, sunsetHorizon, sunset * (1.0 - height) * 0.9);

    float patch = sin(dir.x * 4.0 + dir.y * 2.5) * sin(dir.z * 3.5 + dir.y * 1.8);
    float detail = sin(dir.x * 9.0 - dir.z * 7.0 + dir.y * 5.0);
    float shape = smoothstep(0.28, 0.82, patch * 0.35 + detail * 0.15 + 0.5);
    vec3 cloudCol = mix(vec3(0.38, 0.44, 0.54), vec3(0.90, 0.92, 0.95), uDayFactor);
    float cloud = uCloud * mix(0.45, 1.0, shape) * smoothstep(0.02, 0.45, height);
    col = mix(col, cloudCol, cloud);

    float fog = step(1.5, uState) * (1.0 - step(2.5, uState));
    col = mix(col, vec3(0.72, 0.75, 0.78), fog * 0.8);

    float storm = step(2.5, uState) * (1.0 - step(4.5, uState));
    storm = max(storm, step(5.5, uState));
    col *= mix(1.0, 0.42, storm);

    float snow = step(4.5, uState) * (1.0 - step(5.5, uState));
    col = mix(col, vec3(0.78, 0.82, 0.88), snow * 0.45);

    float star = fract(sin(dot(floor(dir * 90.0), vec3(12.9898, 78.233, 45.164))) * 43758.5453);
    float night = (1.0 - uDayFactor) * (1.0 - uCloud) * smoothstep(0.25, 0.7, height);
    col += step(0.992, star) * night;

    gl_FragColor = vec4(col, 1.0);
  }
`

function smoothstep(t) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

function minutesOf(iso) {
  if (!iso || iso.length < 16) return null
  const hours = Number(iso.slice(11, 13))
  const mins = Number(iso.slice(14, 16))
  if (Number.isNaN(hours) || Number.isNaN(mins)) return null
  return hours * 60 + mins
}

export function dayFactorFromClock(now, sunrise, sunset, isDay) {
  if (now == null || sunrise == null || sunset == null || sunset <= sunrise) {
    return isDay ? 1 : 0
  }
  const dawnStart = sunrise - TWILIGHT_MINUTES
  const dawnEnd = sunrise + TWILIGHT_MINUTES
  const duskStart = sunset - TWILIGHT_MINUTES
  const duskEnd = sunset + TWILIGHT_MINUTES
  if (now <= dawnStart || now >= duskEnd) return 0
  if (now < dawnEnd) return smoothstep((now - dawnStart) / (dawnEnd - dawnStart))
  if (now > duskStart) return 1 - smoothstep((now - duskStart) / (duskEnd - duskStart))
  return 1
}

export function createSky(scene) {
  const uniforms = {
    uDayFactor: { value: 0.65 },
    uCloud: { value: 0.2 },
    uState: { value: 0 },
  }

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(180, 48, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
      uniforms,
      vertexShader,
      fragmentShader,
    }),
  )
  scene.add(dome)

  const sun = new THREE.DirectionalLight(0xfff1d6, 2.4)
  sun.position.set(30, 40, 16)
  scene.add(sun)
  scene.add(new THREE.AmbientLight(0xb7c6dc, 0.55))

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(140, 48),
    new THREE.MeshStandardMaterial({ color: 0x1b2836, roughness: 1, metalness: 0 }),
  )
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  function placeSun(dayFactor, now, sunrise, sunset) {
    let progress = dayFactor
    if (now != null && sunrise != null && sunset != null && sunset > sunrise) {
      progress = (now - sunrise) / (sunset - sunrise)
    }
    const clamped = Math.min(1, Math.max(0, progress))
    const elevation = Math.sin(clamped * Math.PI)
    const eastWest = Math.cos(clamped * Math.PI)
    const height = dayFactor <= 0 ? -12 : 4 + elevation * 48
    sun.position.set(eastWest * 36, height, 18)
    sun.intensity = 0.15 + dayFactor * 2.8
    sun.color.setHSL(0.08 + dayFactor * 0.04, 0.75, 0.5 + dayFactor * 0.12)
    ground.material.color.set(dayFactor > 0.35 ? 0x243628 : 0x1b2836)
  }

  placeSun(uniforms.uDayFactor.value, null, null, null)

  return {
    setForecast(forecast) {
      const current = forecast.current ?? {}
      const daily = forecast.daily ?? {}
      const now = minutesOf(current.time)
      const sunrise = minutesOf(daily.sunrise?.[0])
      const sunset = minutesOf(daily.sunset?.[0])
      const dayFactor = dayFactorFromClock(now, sunrise, sunset, current.is_day === 1)
      const cloud = Math.min(1, Math.max(0, Number(current.cloud_cover ?? 0) / 100))
      const stateName = weatherCodeToState(current.weather_code)

      uniforms.uDayFactor.value = dayFactor
      uniforms.uCloud.value = cloud
      uniforms.uState.value = STATE_ID[stateName] ?? 1
      placeSun(dayFactor, now, sunrise, sunset)
    },
  }
}
