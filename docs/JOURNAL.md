# LUMUS — Módulo: Journal

## Objetivo
Registrar pensamientos, reflexiones y estados emocionales para el autoconocimiento.

## Ruta
`/journal`

## Color del módulo
Rosa — `#ec4899`

## Funcionalidades

### Entradas Diarias
- Editor de texto enriquecido (negrita, lista, etc.)
- Título opcional
- Tags personalizables
- Una entrada por día (editable)

### Mood Tracker
- Estado de ánimo diario: 1 (muy mal) a 5 (muy bien)
- Emojis representativos para cada nivel
- Una entrada por día
- Gráfico semanal de mood

### Historial
- Lista de entradas anteriores
- Filtros por tags y rango de fechas
- Búsqueda por texto

## IA — Lumus en Journal

### Qué hace la IA
- Analiza el contenido de la entrada y genera un resumen semanal
- Detecta patrones emocionales a lo largo del tiempo
- Identifica señales de estrés o burnout

### Sugerencias rápidas
- "¿Cómo estuve emocionalmente esta semana?"
- "Detectá si estoy estresado"
- "Resumí mi semana"

### Nota de privacidad
Las entradas del journal **no se cachean** — cada llamada a la IA usa el contenido real y fresco para garantizar análisis genuinos.

## Tablas de DB
`journal_entries`, `mood_logs`
