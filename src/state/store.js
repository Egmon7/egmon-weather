import { fetchForecast } from '../api/forecast.js'
import { flyTo, setFavoriteMarkers, showPlanet } from '../scene/globe.js'
import { ensureSky, updateScene } from '../scene/index.js'
import { renderPanel } from '../ui/panel.js'

const RECENT_KEY = 'weather.recent'
const FAVORITES_KEY = 'weather.favorites'
const RECENT_MAX = 5

export const state = {
  place: null,
  forecast: null,
  status: 'idle',
  view: 'globe',
  recent: [],
  favorites: [],
}

const listeners = new Set()
let selection = 0

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit() {
  for (const listener of listeners) listener(state)
}

export function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    state.recent = Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : []
  } catch {
    state.recent = []
  }
  emit()
}

export function removeRecent(id) {
  state.recent = state.recent.filter((item) => item.id !== id)
  localStorage.setItem(RECENT_KEY, JSON.stringify(state.recent))
  emit()
}

function remember(place) {
  if (!place.name) return
  state.recent = [place, ...state.recent.filter((item) => item.id !== place.id)].slice(0, RECENT_MAX)
  localStorage.setItem(RECENT_KEY, JSON.stringify(state.recent))
}

export function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    state.favorites = Array.isArray(parsed) ? parsed : []
  } catch {
    state.favorites = []
  }
  setFavoriteMarkers(state.favorites)
  emit()
}

export function addFavorite(place) {
  if (!place || state.favorites.some((item) => item.id === place.id)) return
  state.favorites = [place, ...state.favorites]
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites))
  setFavoriteMarkers(state.favorites)
  emit()
}

export function removeFavorite(id) {
  state.favorites = state.favorites.filter((item) => item.id !== id)
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites))
  setFavoriteMarkers(state.favorites)
  emit()
}

export function setView(view) {
  state.view = view
  const globe = document.querySelector('#app-globe')
  const sky = document.querySelector('#viewport')
  const toggle = document.querySelector('#view-toggle')
  globe?.classList.toggle('hidden', view !== 'globe')
  sky?.classList.toggle('hidden', view !== 'sky')
  if (toggle) {
    toggle.textContent = view === 'globe' ? 'Voir le ciel' : 'Voir le globe'
    toggle.disabled = !state.place
  }
  window.dispatchEvent(new Event('resize'))
  if (view === 'globe') showPlanet()
  if (view === 'sky') {
    ensureSky()
    if (state.forecast) updateScene(state.forecast, state.place)
  }
  emit()
}

export async function selectPlace(place) {
  const id = ++selection
  const next = {
    ...place,
    id: place.id ?? `gps:${Number(place.latitude).toFixed(2)}:${Number(place.longitude).toFixed(2)}`,
    name: place.name ?? null,
  }
  state.place = next
  state.forecast = null
  state.status = 'loading'
  remember(next)
  emit()
  setView('globe')
  flyTo(next.latitude, next.longitude, next)
  renderPanel(null)

  try {
    const forecast = await fetchForecast(place.latitude, place.longitude)
    if (id !== selection) return
    state.forecast = forecast
    state.status = 'ready'
    renderPanel(forecast)
    updateScene(forecast, next)
  } catch {
    if (id !== selection) return
    state.forecast = null
    state.status = 'error'
    renderPanel(null)
  }
  emit()
}
