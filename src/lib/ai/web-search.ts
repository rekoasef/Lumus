const WEATHER_KEYWORDS = [
  'clima', 'tiempo', 'temperatura', 'lluvia', 'pronóstico', 'pronostico',
  'calor', 'frío', 'frio', 'viento', 'sol', 'nublado', 'tormenta', 'nevada',
  'humedad', 'lloviendo', 'llueve', 'lloverá', 'llovera', 'hace calor',
  'hace frío', 'hace frio', 'está lloviendo', 'weather', 'forecast',
]

const SEARCH_KEYWORDS = [
  'noticias', 'noticia', 'precio del dólar', 'dólar hoy', 'cotización', 'cotizacion',
  'tipo de cambio', 'última hora', 'ultima hora', 'qué pasó hoy', 'que paso hoy',
  'resultado del partido', 'resultados de hoy', 'busca en internet', 'búscame en internet',
  'buscame en internet', 'buscar en internet', 'qué dice internet', 'que dice internet',
]

export type SearchType = 'weather' | 'search' | 'none'

export interface WebSearchResult {
  type: SearchType
  content: string
  searched: boolean
}

export function detectSearchType(query: string): SearchType {
  const lower = query.toLowerCase()
  if (WEATHER_KEYWORDS.some(k => lower.includes(k))) return 'weather'
  if (SEARCH_KEYWORDS.some(k => lower.includes(k))) return 'search'
  return 'none'
}

function extractCityFromQuery(query: string): string | null {
  const patterns = [
    /(?:clima|tiempo|temperatura|pronóstico|pronostico)\s+(?:en|de|para)\s+([a-záéíóúüñ\s]{2,30})(?:\?|$|\.|\s*hoy|\s*mañana)/i,
    /(?:cómo está|como esta|cómo va|como va)\s+el\s+(?:clima|tiempo)\s+(?:en|de)\s+([a-záéíóúüñ\s]{2,30})/i,
    /weather\s+in\s+([a-z\s]{2,30})/i,
  ]

  for (const pattern of patterns) {
    const match = query.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

interface WttrCondition {
  temp_C: string
  FeelsLikeC: string
  humidity: string
  weatherDesc: Array<{ value: string }>
  lang_es?: Array<{ value: string }>
}

interface WttrWeather {
  maxtempC: string
  mintempC: string
}

interface WttrResponse {
  current_condition?: WttrCondition[]
  weather?: WttrWeather[]
}

async function fetchWeather(city: string): Promise<string> {
  const res = await fetch(
    `https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=es`,
    { signal: AbortSignal.timeout(6000), next: { revalidate: 0 } }
  )

  if (!res.ok) throw new Error(`wttr.in error: ${res.status}`)

  const data = await res.json() as WttrResponse
  const current = data.current_condition?.[0]
  const today = data.weather?.[0]

  if (!current) throw new Error('Sin datos de clima')

  const condition =
    current.lang_es?.[0]?.value ??
    current.weatherDesc?.[0]?.value ??
    'sin datos'

  const lines = [
    `Clima actual en ${city}:`,
    `• Condición: ${condition}`,
    `• Temperatura: ${current.temp_C}°C (sensación: ${current.FeelsLikeC}°C)`,
    `• Humedad: ${current.humidity}%`,
  ]

  if (today) {
    lines.push(`• Máxima: ${today.maxtempC}°C / Mínima: ${today.mintempC}°C`)
  }

  return lines.join('\n')
}

interface BraveResult {
  title: string
  description: string
  url: string
}

interface BraveResponse {
  web?: { results: BraveResult[] }
}

async function fetchBraveSearch(query: string): Promise<string> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return ''

  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3&country=ar&lang=es`,
    {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      signal: AbortSignal.timeout(7000),
      next: { revalidate: 0 },
    }
  )

  if (!res.ok) throw new Error(`Brave Search error: ${res.status}`)

  const data = await res.json() as BraveResponse
  const results = data.web?.results ?? []

  return results
    .slice(0, 3)
    .map(r => `[${r.title}]\n${r.description}`)
    .join('\n\n')
}

export async function getWebContext(
  query: string,
  defaultCity = 'Buenos Aires'
): Promise<WebSearchResult> {
  const type = detectSearchType(query)

  if (type === 'none') {
    return { type: 'none', content: '', searched: false }
  }

  try {
    if (type === 'weather') {
      const city = extractCityFromQuery(query) ?? defaultCity
      const content = await fetchWeather(city)
      return { type: 'weather', content, searched: true }
    }

    const content = await fetchBraveSearch(query)
    if (!content) return { type: 'search', content: '', searched: false }
    return { type: 'search', content, searched: true }
  } catch {
    return { type, content: '', searched: false }
  }
}
