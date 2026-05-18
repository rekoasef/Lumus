# LUMUS — Módulo: Comidas & Nutrición

## Objetivo
Planificar la alimentación semanal, registrar comidas y acceder a recetas inteligentes.

## Ruta
`/comidas`

## Color del módulo
Naranja — `#f97316`

## Funcionalidades

### Registro de Comidas
- 4 momentos: desayuno, almuerzo, merienda, cena
- Asociar receta guardada o ingresar nombre manual
- Historial semanal con vista por día

### Recetas
- CRUD de recetas personales
- Ingredientes: lista con nombre, cantidad y unidad
- Info nutricional: calorías, proteínas, carbohidratos, grasas
- Tiempo de preparación
- Marcar como favorita
- Recetas generadas por IA (guardadas con `ai_generated: true`)

### Lista del Supermercado
- Agregar items manualmente con categoría
- Generación automática por IA desde el menú semanal
- Marcar items como comprados
- Limpiar lista / nueva lista

## IA — Lumus en Comidas

### Sugerencias rápidas
- "¿Qué cocino hoy?"
- "Armame un meal prep para la semana"
- "Algo alto en proteínas y barato"
- "Recetas con lo que tengo en casa"
- "Generame la lista del super para esta semana"

## Tablas de DB
`recipes`, `meal_logs`, `shopping_list_items`
