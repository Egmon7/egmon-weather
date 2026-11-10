import { searchCities } from '../api/geocoding.js'
import { addFavorite, removeFavorite, selectPlace, setView, state, subscribe } from '../state/store.js'

const BUTTON_CLASS = 'rounded-full border border-white/10 bg-[#171d2e] px-3 py-2 text-left text-sm text-white hover:border-[#d9b780]'

function placeLabel(place) {
  if (place.name == null) {
    return `${Number(place.latitude).toFixed(2)}, ${Number(place.longitude).toFixed(2)}`
  }
  return [place.name, place.admin1, place.country].filter(Boolean).join(', ')
}

function renderCityButtons(container, places) {
  container.replaceChildren()
  for (const place of places) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = BUTTON_CLASS
    button.textContent = placeLabel(place)
    button.addEventListener('click', () => {
      if (container.id === 'results') container.replaceChildren()
      selectPlace(place)
    })
    container.append(button)
  }
}

function renderRecent(places) {
  const recent = document.querySelector('#recent')
  recent.replaceChildren()
  if (places.length === 0) return

  const title = document.createElement('p')
  title.className = 'text-xs font-medium uppercase tracking-wide text-[#d9b780]'
  title.textContent = 'Récentes'
  const list = document.createElement('div')
  list.className = 'flex flex-wrap gap-2'
  recent.append(title, list)
  renderCityButtons(list, places)
}

function renderFavorites(places) {
  const favorites = document.querySelector('#favorites')
  favorites.replaceChildren()
  if (places.length === 0) return

  const title = document.createElement('p')
  title.className = 'text-xs font-medium uppercase tracking-wide text-[#d9b780]'
  title.textContent = 'Favoris'
  const list = document.createElement('div')
  list.className = 'flex flex-wrap gap-2'
  favorites.append(title, list)
  renderCityButtons(list, places)
}

function syncPlaceActions() {
  const saved = state.place && state.favorites.some((item) => item.id === state.place.id)
  const favoriteButton = document.querySelector('#save-favorite')
  const toggle = document.querySelector('#view-toggle')
  favoriteButton.disabled = !state.place
  favoriteButton.textContent = saved ? 'Retirer' : 'Favori'
  toggle.disabled = !state.place
  toggle.textContent = state.view === 'globe' ? 'Voir le ciel' : 'Voir le globe'
}

export function mountSearch() {
  const form = document.querySelector('#search-form')
  const input = document.querySelector('#search')
  const clearButton = document.querySelector('#search-clear')
  const results = document.querySelector('#results')
  const error = document.querySelector('#error')
  let timer = 0
  let requestId = 0

  function syncClear() {
    clearButton.classList.toggle('hidden', input.value.trim() === '')
  }

  clearButton.addEventListener('click', () => {
    input.value = ''
    results.replaceChildren()
    error.textContent = ''
    syncClear()
    input.focus()
  })

  document.querySelector('#view-toggle').addEventListener('click', () => {
    if (!state.place) return
    setView(state.view === 'globe' ? 'sky' : 'globe')
  })

  document.querySelector('#save-favorite').addEventListener('click', () => {
    if (!state.place) return
    const saved = state.favorites.some((item) => item.id === state.place.id)
    if (saved) removeFavorite(state.place.id)
    else addFavorite(state.place)
  })

  document.querySelector('#locate').addEventListener('click', () => {
    if (!navigator.geolocation) {
      error.textContent = 'La géolocalisation n’est pas disponible.'
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        selectPlace({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          name: null,
        })
      },
      () => {
        error.textContent = 'Localisation refusée.'
      },
    )
  })

  subscribe(() => {
    renderRecent(state.recent)
    renderFavorites(state.favorites)
    syncPlaceActions()
    if (state.status === 'error') error.textContent = 'La météo n\'a pas pu être chargée.'
    if (state.status === 'loading') error.textContent = ''
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    clearTimeout(timer)
    runSearch(input.value)
  })

  input.addEventListener('input', () => {
    syncClear()
    clearTimeout(timer)
    timer = setTimeout(() => runSearch(input.value), 300)
  })

  async function runSearch(name) {
    const query = name.trim()
    const id = ++requestId
    if (!query) {
      results.replaceChildren()
      return
    }

    try {
      const cities = await searchCities(query)
      if (id !== requestId) return
      if (cities.length === 0) {
        error.textContent = 'Aucune ville trouvée.'
        results.replaceChildren()
        return
      }
      error.textContent = ''
      renderCityButtons(results, cities)
    } catch {
      if (id !== requestId) return
      error.textContent = 'La recherche a échoué.'
      results.replaceChildren()
    }
  }
}
