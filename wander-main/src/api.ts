const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export type WeatherData = {
  city: string
  temperature: number
  weather: string
}

export type ForecastDay = {
  date: string
  tempMin: number
  tempMax: number
  weather: string
}

export type PlaceData = {
  place_id: number
  osm_type: string
  osm_id: number
  lat: string
  lon: string
  class: string
  type: string
  name?: string
  display_name: string
}

async function apiGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(path, API_BASE_URL)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))

  const response = await fetch(url)

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed with status ${response.status}`)
  }

  return response.json()
}

export function fetchWeather(city: string): Promise<WeatherData> {
  return apiGet<WeatherData>('/api/weather', { city })
}

export function fetchForecast(city: string): Promise<ForecastDay[]> {
  return apiGet<ForecastDay[]>('/api/forecast', { city })
}

export function fetchPlaces(city: string, category?: string): Promise<PlaceData[]> {
  return apiGet<PlaceData[]>('/api/places', category ? { city, category } : { city })
}
