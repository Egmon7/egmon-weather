const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

export async function searchCities(name) {
  const query = name.trim()
  if (!query) return []

  const url = new URL(GEOCODING_URL)
  url.searchParams.set('name', query)
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
