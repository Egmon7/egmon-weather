const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

function fold(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr')
    .replace(/\s+/g, ' ')
    .trim()
}

async function request(name) {
  const url = new URL(GEOCODING_URL)
  url.searchParams.set('name', name)
  url.searchParams.set('count', '5')
  url.searchParams.set('language', 'fr')
  url.searchParams.set('format', 'json')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Geocoding ${response.status}`)
  }

  const data = await response.json()
  if (!data.results) return []

  return data.results.map((place) => ({
    id: place.id,
    name: place.name,
    country: place.country,
    admin1: place.admin1 ?? null,
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone,
  }))
}

export async function searchCities(name) {
  const query = name.trim().replace(/\s+/g, ' ')
  if (!query) return []

  const folded = fold(query)
  const direct = await request(query)
  const loose = folded === query.toLocaleLowerCase('fr') ? [] : await request(folded)
  const seen = new Set()
  const places = []
  for (const place of [...direct, ...loose]) {
    if (seen.has(place.id)) continue
    seen.add(place.id)
    places.push(place)
  }

  places.sort((a, b) => {
    const rank = (place) => {
      const label = fold(place.name ?? '')
      if (label === folded) return 0
      if (label.startsWith(folded)) return 1
      return 2
    }
    return rank(a) - rank(b)
  })

  return places.slice(0, 5)
}
