import { state } from '../state/store.js'
import { weatherCodeToState } from '../lib/weatherCodes.js'

const STATE_LABELS = {
  clear: 'clair',
  cloudy: 'nuageux',
  fog: 'brouillard',
  drizzle: 'bruine',
  rain: 'pluie',
  snow: 'neige',
  thunder: 'orage',
}

const WIND_SECTORS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']

function forecastHost() {
  const panel = document.querySelector('#panel')
  let host = document.querySelector('#forecast')
  if (!host) {
    host = document.createElement('div')
    host.id = 'forecast'
    host.className = 'mt-6'
    panel.append(host)
  }
  return host
}

function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

function formatNumber(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value)
}

function clockLabel(iso) {
  if (!iso || iso.length < 16) return '—'
  return iso.slice(11, 16)
}

function dayLabel(iso) {
  if (!iso) return '—'
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function stateLabel(code) {
  return STATE_LABELS[weatherCodeToState(code)] ?? 'nuageux'
}

function windLabel(degrees) {
  if (degrees == null || Number.isNaN(Number(degrees))) return '—'
  const sector = WIND_SECTORS[Math.round(Number(degrees) / 45) % 8]
  return `${Math.round(degrees)}° (${sector})`
}

function stat(label, value) {
  const row = el('div', 'rounded-2xl border border-white/10 bg-[#171d2e] px-3 py-2')
  row.append(el('dt', 'text-xs text-[#8b95a8]', label))
  row.append(el('dd', 'text-sm font-medium text-white', value))
  return row
}

export function renderPanel(forecast) {
  const host = forecastHost()
  host.replaceChildren()

  if (state.status === 'loading') {
    host.append(el('p', 'text-center text-sm text-[#b7c0d0]', 'Le globe se tourne vers la ville…'))
    return
  }
  if (!forecast) return

  const place = state.place
  const current = forecast.current
  const hourly = forecast.hourly
  const daily = forecast.daily

  const header = el('div')
  if (place) {
    const label = place.name == null
      ? `${Number(place.latitude).toFixed(2)}, ${Number(place.longitude).toFixed(2)}`
      : [place.name, place.admin1, place.country].filter(Boolean).join(', ')
    header.append(el('p', 'text-sm text-[#b7c0d0]', label))
  }
  header.append(el('p', 'font-serif text-5xl text-white', `${formatNumber(current.temperature_2m)} °C`))
  header.append(el('p', 'text-sm capitalize text-[#d9b780]', stateLabel(current.weather_code)))
  host.append(header)

  const stats = el('dl', 'mt-4 grid grid-cols-2 gap-2')
  stats.append(stat('Ressenti', `${formatNumber(current.apparent_temperature)} °C`))
  stats.append(stat('Humidité', `${formatNumber(current.relative_humidity_2m, 0)} %`))
  stats.append(stat('Vent', `${formatNumber(current.wind_speed_10m)} km/h`))
  stats.append(stat('Direction', windLabel(current.wind_direction_10m)))
  stats.append(stat('Pluie (probabilité)', `${formatNumber(hourly.precipitation_probability?.[0], 0)} %`))
  stats.append(stat('Pluie (heure / jour)', `${formatNumber(current.precipitation)} / ${formatNumber(daily.precipitation_sum?.[0])} mm`))
  stats.append(stat('Lever', clockLabel(daily.sunrise?.[0])))
  stats.append(stat('Coucher', clockLabel(daily.sunset?.[0])))
  host.append(stats)

  host.append(el('h2', 'mt-6 text-xs font-medium uppercase tracking-wide text-[#d9b780]', 'Heure par heure'))
  const hours = el('ul', 'mt-2 flex flex-col gap-1 text-sm text-white')
  const hourCount = Math.min(hourly.time?.length ?? 0, 24)
  for (let index = 0; index < hourCount; index += 1) {
    const item = el('li', 'flex items-center justify-between gap-3 border-b border-white/10 py-1')
    item.append(el('span', 'text-[#8b95a8]', clockLabel(hourly.time[index])))
    item.append(el('span', null, `${formatNumber(hourly.temperature_2m[index])} °C`))
    item.append(el('span', 'capitalize text-[#b7c0d0]', stateLabel(hourly.weather_code[index])))
    hours.append(item)
  }
  host.append(hours)

  host.append(el('h2', 'mt-6 text-xs font-medium uppercase tracking-wide text-[#d9b780]', '7 jours'))
  const days = el('ul', 'mt-2 flex flex-col gap-1 text-sm text-white')
  const dayCount = Math.min(daily.time?.length ?? 0, 7)
  for (let index = 0; index < dayCount; index += 1) {
    const item = el('li', 'flex items-center justify-between gap-3 border-b border-white/10 py-1')
    item.append(el('span', 'capitalize text-[#8b95a8]', dayLabel(daily.time[index])))
    item.append(el('span', null, `${formatNumber(daily.temperature_2m_min[index])}° / ${formatNumber(daily.temperature_2m_max[index])}°`))
    item.append(el('span', 'capitalize text-[#b7c0d0]', stateLabel(daily.weather_code[index])))
    days.append(item)
  }
  host.append(days)
}
