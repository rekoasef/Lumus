'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, Droplets } from 'lucide-react'
import { WeatherIcon, getConditionFromCode, CONDITION_LABELS } from './weather-icon'
import type { WeatherCondition } from './weather-icon'

const FALLBACK_LAT = -32.9468
const FALLBACK_LON = -60.6393
const FALLBACK_CITY = 'Rosario'

interface WeatherState {
  condition: WeatherCondition
  temp: number
  feelsLike: number
  humidity: number
  tempMax: number
  tempMin: number
  city: string
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number
    weather_code: number
    apparent_temperature: number
    relative_humidity_2m: number
  }
  daily: {
    temperature_2m_max: number[]
    temperature_2m_min: number[]
  }
}

interface NominatimResponse {
  address?: {
    city?: string
    town?: string
    municipality?: string
    county?: string
    state?: string
  }
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherState> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,apparent_temperature,relative_humidity_2m` +
    `&daily=temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=1`

  const [weatherRes, geoRes] = await Promise.allSettled([
    fetch(url).then(r => r.json() as Promise<OpenMeteoResponse>),
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`,
      { headers: { 'User-Agent': 'Lumus Personal OS (radevelopment02@gmail.com)' } }
    ).then(r => r.json() as Promise<NominatimResponse>),
  ])

  if (weatherRes.status === 'rejected') throw new Error('Weather fetch failed')

  const w = weatherRes.value
  const geo = geoRes.status === 'fulfilled' ? geoRes.value : null
  const city =
    geo?.address?.city ??
    geo?.address?.town ??
    geo?.address?.municipality ??
    geo?.address?.county ??
    FALLBACK_CITY

  return {
    condition: getConditionFromCode(w.current.weather_code),
    temp: Math.round(w.current.temperature_2m),
    feelsLike: Math.round(w.current.apparent_temperature),
    humidity: Math.round(w.current.relative_humidity_2m),
    tempMax: Math.round(w.daily.temperature_2m_max[0]),
    tempMin: Math.round(w.daily.temperature_2m_min[0]),
    city,
  }
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherState | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setError(false)

    const doFetch = (lat: number, lon: number) => {
      fetchWeather(lat, lon)
        .then(setWeather)
        .catch(() => setError(true))
    }

    if (!navigator.geolocation) {
      doFetch(FALLBACK_LAT, FALLBACK_LON)
      return
    }

    navigator.geolocation.getCurrentPosition(
      pos => doFetch(pos.coords.latitude, pos.coords.longitude),
      () => doFetch(FALLBACK_LAT, FALLBACK_LON),
      { timeout: 6000 }
    )
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [load])

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <span>Clima no disponible</span>
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 animate-pulse rounded-xl bg-white/5" />
        <div className="space-y-2">
          <div className="h-8 w-20 animate-pulse rounded-lg bg-white/5" />
          <div className="h-4 w-28 animate-pulse rounded-lg bg-white/5" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <WeatherIcon condition={weather.condition} size={68} />

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-[var(--text-primary)] tabular-nums">
            {weather.temp}°
          </span>
          <span className="text-sm text-[var(--text-muted)]">
            {weather.tempMin}° / {weather.tempMax}°
          </span>
        </div>

        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
          {CONDITION_LABELS[weather.condition]}
        </p>

        <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <MapPin size={10} />
            {weather.city}
          </span>
          <span className="flex items-center gap-1">
            <Droplets size={10} />
            {weather.humidity}%
          </span>
          <span>ST {weather.feelsLike}°</span>
        </div>
      </div>
    </div>
  )
}
