# LUMUS — Módulo Comidas V2: Plan de Desarrollo

## Visión general

Rediseño completo del módulo de Comidas & Nutrición. El objetivo es que Lumus sea un
asistente nutricional real: que el usuario pueda saber exactamente qué está comiendo,
cuántas calorías y proteínas consume por día, y que tenga un libro de recetas inteligente
con ayuda de IA en cada paso.

---

## Features nuevas — roadmap

### 1. Tracking calórico inteligente

**Análisis de comida por foto o descripción**
- El usuario sube una foto o escribe "comí una milanesa con papas fritas"
- Lumus (Claude vision) estima: calorías, proteínas, carbohidratos, grasas
- El resultado se puede agregar directamente al meal log del día
- API: `POST /api/food/analyze-food`

**Meta calórica diaria personalizada (TDEE)**
- Campos en `user_profiles`: `activity_level`, `trains`, `daily_calorie_goal`, `daily_protein_goal`
- Calculadora TDEE: peso × factor de actividad (sedentario / moderado / activo / muy activo)
- El usuario puede sobreescribir la meta calculada
- Proteína meta: 1.6g/kg si entrena, 1.2g/kg si no

**Progreso diario visible**
- Banner en la sección "Hoy" con barra de progreso de calorías y proteínas
- Breakdown por comida: desayuno/almuerzo/merienda/cena con sus kcal y g de proteína
- Color: verde si está en rango, naranja si está cerca del límite, rojo si lo superó

---

### 2. Recetas mejoradas — Libro de cocina

**Categorías de recetas**
- Nueva columna `category` en `recipes`: `desayuno | almuerzo | merienda | cena | postre | otro`
- Filtro por categoría en la sección Recetas
- Badge de color por categoría en cada RecipeCard

**Porciones**
- Nueva columna `servings` en `recipes`
- La info nutricional es por porción
- Escalado visual: si cambiás las porciones, recalcula ingredientes

**Pasos de preparación como lista**
- `instructions` pasa a ser un array de strings serializado como JSONB
- Cada paso numerado, se puede tachar (modo cocinar)

**Lumus dentro de cada receta**
- Chat inline en el detalle de receta
- Preguntas como: "¿qué pasa si cocino esto a fuego fuerte?", "¿puedo reemplazar la manteca?"
- Contexto de la receta inyectado automáticamente en el prompt

**Generación iterativa de recetas**
- Crear receta con Lumus y luego refinarla conversacionalmente
- "Sacale los champiñones", "ponele más ajo", "hacela más rápida"
- Historial de la conversación de refinamiento guardado en `ai_conversations`

**Export de receta**
- Exportar como PDF (usando `@react-pdf/renderer`)
- Compartir como texto formateado (para WhatsApp, etc.)

---

### 3. Lista del Súper mejorada

**Importar texto libre**
- Botón "Importar lista" abre un textarea
- El usuario pega cualquier texto (lista de ChatGPT, texto del super, etc.)
- API: `POST /api/food/shopping-list/parse` — usa IA para extraer items con nombre, cantidad y categoría
- Preview de los items antes de confirmar

**Generar lista desde recetas**
- Seleccionar recetas de la semana → Lumus genera la lista de ingredientes consolidada
- Evita duplicados (junta cantidades del mismo ingrediente)

**UX mejorada**
- Drag para reordenar items
- Categorías con colores/iconos
- Contador de items pendientes por categoría
- Animación de tachado al completar

---

### 4. Dashboard nutricional semanal

Nueva sección "Semana" en el tab del módulo:
- Gráfico de barras: calorías por día (últimos 7 días) vs meta
- Promedio de proteínas semanal
- Racha de días dentro de la meta calórica
- Día más alto / más bajo de la semana
- Distribución por tipo de comida (desayuno vs cena pesa más, etc.)

---

### 5. Features adicionales (fase posterior)

- **"¿Qué tengo en casa?"** — listar ingredientes y que Lumus sugiera recetas
- **Escáner de código de barras** — Open Food Facts API para productos del super
- **Escalado de porciones** — ajustar receta para N personas
- **Racha de cumplimiento** — streak de días en meta (gamificación)

---

## Schema DB — cambios necesarios

### Tabla `recipes` — columnas nuevas
```sql
alter table recipes
  add column category     text default 'otro',   -- 'desayuno'|'almuerzo'|'merienda'|'cena'|'postre'|'otro'
  add column servings     int default 1;          -- porciones por receta
```

### Tabla `meal_logs` — columnas nuevas
```sql
alter table meal_logs
  add column protein_g  numeric(6,2),   -- proteínas del registro
  add column photo_url  text;           -- foto subida por el usuario (Supabase Storage)
```

### Tabla `user_profiles` — columnas nuevas
```sql
alter table user_profiles
  add column activity_level      text default 'moderado',  -- 'sedentario'|'moderado'|'activo'|'muy_activo'
  add column trains               boolean default false,
  add column daily_calorie_goal   int,    -- kcal/día (calculado o manual)
  add column daily_protein_goal   int;    -- gramos de proteína/día
```

---

## API Routes nuevas

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/food/analyze-food` | POST | Analiza foto o texto → info nutricional |
| `/api/food/shopping-list/parse` | POST | Parsea texto libre → items de lista |
| `/api/food/nutrition-goals` | GET/PUT | Obtiene y actualiza metas del usuario |

---

## Archivos a crear / modificar

### Nuevos
- `src/app/api/food/analyze-food/route.ts`
- `src/app/api/food/shopping-list/parse/route.ts`
- `src/app/api/food/nutrition-goals/route.ts`
- `src/components/modules/comidas/food-analyzer.tsx`
- `src/components/modules/comidas/nutrition-goal-banner.tsx`
- `src/components/modules/comidas/weekly-nutrition-chart.tsx`
- `src/components/modules/comidas/recipe-detail.tsx`

### Modificados
- `src/types/food.types.ts` — nuevos campos
- `src/lib/validations/food.ts` — nuevos schemas
- `src/app/api/food/recipes/generate/route.ts` — agregar category
- `src/components/modules/comidas/comidas-dashboard.tsx` — nueva tab Semana
- `src/components/modules/comidas/meal-log-form.tsx` — foto + proteína
- `src/components/modules/comidas/recipe-card.tsx` — categoría + Lumus
- `src/components/modules/comidas/recipe-form.tsx` — categoría + porciones
- `src/components/modules/comidas/shopping-list.tsx` — import text

---

## Orden de desarrollo

1. Migrations DB → tipos TS → validaciones Zod
2. APIs: analyze-food, parse-shopping-list, nutrition-goals
3. UI: NutritionGoalBanner + FoodAnalyzer
4. UI: Recetas mejoradas (categorías, Lumus inline, export)
5. UI: Lista del súper mejorada
6. UI: Dashboard semanal
