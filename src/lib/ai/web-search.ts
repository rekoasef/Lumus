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
  'precio de', 'cuánto cuesta', 'cuanto cuesta', 'cuánto vale', 'cuanto vale',
  'qué es', 'que es', 'quién es', 'quien es', 'dónde queda', 'donde queda',
  'cómo se hace', 'como se hace', 'cómo funciona', 'como funciona',
  'receta de', 'qué significa', 'que significa',
  'hoy en', 'esta semana', 'este mes',
  'infobae', 'lanacion', 'clarin', 'ambito',
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

interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
}

interface TavilyResponse {
  answer?: string
  results: TavilyResult[]
}

async function fetchTavilySearch(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return ''

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      include_answer: true,
      max_results: 4,
      include_raw_content: false,
    }),
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 0 },
  })

  if (!res.ok) throw new Error(`Tavily error: ${res.status}`)

  const data = await res.json() as TavilyResponse

  const parts: string[] = []

  if (data.answer) {
    parts.push(`Resumen: ${data.answer}`)
  }

  const topResults = (data.results ?? [])
    .filter(r => r.score > 0.3)
    .slice(0, 3)
    .map(r => `[${r.title}]\n${r.content}`)

  if (topResults.length) {
    parts.push(...topResults)
  }

  return parts.join('\n\n')
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

    const content = await fetchTavilySearch(query)
    if (!content) return { type: 'search', content: '', searched: false }
    return { type: 'search', content, searched: true }
  } catch {
    return { type, content: '', searched: false }
  }
}
