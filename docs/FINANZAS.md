# LUMUS — Módulo: Finanzas

## Objetivo
Gestionar dinero, analizar gastos y alcanzar metas financieras personales.

## Ruta
`/finanzas`

## Color del módulo
Verde — `#22c55e`

## Funcionalidades

### Billeteras
- Tipos: efectivo, banco, virtual (Mercado Pago, etc.)
- Balance por billetera
- Color e ícono customizable
- Soft delete

### Categorías
- Default: comida, transporte, ocio, salud, educación, ropa, hogar, tecnología, suscripciones
- Custom categories con color e ícono
- Tipo: gasto o ingreso

### Transacciones
- Registrar gasto o ingreso
- Campos: monto, billetera, categoría, descripción, fecha
- **Clasificación automática por IA** (GPT-4o mini) al tipear descripción
- Listado con filtros: tipo, categoría, billetera, rango de fechas
- Editar y eliminar (soft delete)

### Presupuestos
- Límite mensual por categoría
- Indicador visual: verde (< 60%), amarillo (60-80%), rojo (> 80%)
- Alerta de notificación al superar 80%

### Suscripciones
- Netflix, Spotify, etc. con monto y fecha de cobro
- Resumen del gasto mensual total en suscripciones
- Ciclo: mensual, anual, semanal

### Metas de Ahorro
- Meta con nombre, monto objetivo, fecha objetivo
- Registrar aportes
- Barra de progreso
- Vincular a una billetera

### Reportes
- Ruta: `/finanzas/reportes`
- Gastos por categoría (pie chart)
- Evolución mensual ingresos vs gastos (line chart)
- Top 5 categorías del mes
- Proyección al fin de mes

## IA — Lumus en Finanzas

### Contexto que usa
```json
{
  "gastado_mes": 45000,
  "presupuesto_mes": 60000,
  "categoria_top_gasto": "comida",
  "dias_para_fin_mes": 12,
  "balance_total": 128000,
  "suscripciones_mes": 8500
}
```

### Sugerencias rápidas
- "¿En qué gasto de más?"
- "¿Puedo ahorrar más?"
- "Analizá mis gastos del mes"
- "¿Cuánto me queda para fin de mes?"

### Clasificación automática
Al ingresar descripción de un gasto, se llama `/api/ai/classify` con GPT-4o mini.
Si la confianza es alta, se autocompleta la categoría. El usuario puede cambiarla.

## Tablas de DB
`wallets`, `finance_categories`, `transactions`, `budgets`, `subscriptions`, `saving_goals`
