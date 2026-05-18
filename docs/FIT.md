# LUMUS — Módulo: Fit & Salud

## Objetivo
Gestionar progreso físico, registrar entrenamientos y mantener hábitos saludables.

## Ruta
`/fit`

## Color del módulo
Rojo — `#ef4444`

## Funcionalidades

### Seguimiento Corporal
- Registrar peso, medidas corporales, % de grasa corporal
- Subir foto de progreso (Supabase Storage — carpeta `fit/{userId}/`)
- Gráfico de evolución de peso (line chart)
- Tendencia: bajando / subiendo / estable

### Ejercicios
- Biblioteca de ejercicios con grupo muscular
- Ejercicios default pre-cargados + custom del usuario

### Rutinas de Entrenamiento
- Crear rutinas con nombre y objetivo (hipertrofia, fuerza, definición, cardio)
- Agregar ejercicios con sets, reps y descanso
- Rutinas generadas por IA

### Sesiones
- Registrar sesión: qué rutina, cuánto duró
- Log por ejercicio: sets completados, reps y peso real
- Historial de sesiones

### Hábitos de Salud Diarios
- Agua consumida (ml) — con tracker visual tipo vasos
- Horas de sueño
- Pasos del día
- Se conecta con el módulo de Hábitos

## IA — Lumus en Fit

### Contexto que usa
```json
{
  "ultimo_peso": 78.5,
  "tendencia_peso": "bajando",
  "sesiones_semana": 3,
  "sueno_promedio": 6.5,
  "agua_promedio_ml": 1800
}
```

### Sugerencias rápidas
- "Generame una rutina para hipertrofia"
- "Analizá mi progreso de este mes"
- "¿Estoy mejorando?"
- "Rutina de 3 días para definición"

## Tablas de DB
`body_records`, `workout_exercises`, `workout_routines`, `workout_routine_exercises`, `workout_sessions`, `workout_session_logs`, `health_logs`
