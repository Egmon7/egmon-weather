const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

const CURRENT = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'precipitation',
  'cloud_cover',
  'is_day',
].join(',')

const HOURLY = [
  'temperature_2m',
  'precipitation_probability',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
].join(',')

const DAILY = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'sunrise',
  'sunset',
  'wind_speed_10m_max',
  'wind_direction_10m_dominant',
].join(',')

export async function fetchForecast(latitude, longitude) {
  const url = new URL(FORECAST_URL)
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('current', CURRENT)
  url.searchParams.set('hourly', HOURLY)
  url.searchParams.set('daily', DAILY)
  url.searchParams.set('forecast_hours', '24')
  url.searchParams.set('forecast_days', '7')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Forecast ${response.status}`)
  }

  const data = await response.json()
  return {
    current: data.current,
    hourly: data.hourly,
    daily: data.daily,
    timezone: data.timezone,
  }
}
