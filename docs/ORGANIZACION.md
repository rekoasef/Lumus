# LUMUS — Módulo: Organización

## Objetivo
Gestionar tiempo, tareas y planificación personal de forma eficiente.

## Ruta
`/organizacion`

## Color del módulo
Violeta — `#7c6dfa` (accent base de Lumus)

## Funcionalidades

### Tareas
- CRUD completo
- Prioridades: alta, media, baja
- Estados: pendiente, en_progreso, completada
- Etiquetas personalizadas con color
- Fecha de vencimiento con indicador visual si está vencida
- Subtareas anidadas (un nivel)
- Soft delete

### Calendario
- Vista diaria, semanal y mensual
- Las tareas con due_date aparecen en el día correspondiente
- Crear eventos de calendario independientes
- Time blocking visual

### Rutinas
- Rutinas predefinidas: mañana, noche, trabajo, estudio
- Rutinas custom
- Asociar tareas a una rutina

### Objetivos
- Objetivos mensuales y anuales
- Progress tracker (0-100%)
- Marcar como alcanzado

## IA — Lumus en Organización

### Contexto que usa
```json
{
  "tareas_pendientes": 5,
  "tareas_completadas_semana": 12,
  "tareas_vencidas": 2,
  "proximas_tareas": ["Entregar informe", "Llamar al banco", "Gym"],
  "objetivos_mes": ["Terminar curso Next.js", "Ahorrar $20k"]
}
```

### Sugerencias rápidas
- "Organizame la semana"
- "¿Qué priorizo hoy?"
- "Tengo demasiado trabajo"
- "¿Qué está vencido?"

## Estadísticas
- Tareas completadas por semana (bar chart)
- Ratio de completado vs creado
- Cumplimiento de objetivos del mes (%)
- Racha de productividad

## Tablas de DB
`tasks`, `task_labels`, `task_label_assignments`, `routines`, `objectives`, `calendar_events`
