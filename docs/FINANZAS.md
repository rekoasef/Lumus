# LUMUS — Módulo: Finanzas

> Actualizado 2026-08-18. Este es el único módulo de producto que existe hoy — ver `docs/ESTADO_ACTUAL.md` para el contexto completo del pivot.

## Objetivo
Gestionar dinero, analizar gastos y alcanzar metas financieras personales.

## Rutas
`/finanzas`, `/finanzas/reportes`

## Color del módulo
Verde — `#22c55e`

## Funcionalidades

### Billeteras
- Tipos: efectivo, banco, virtual (Mercado Pago, etc.)
- Balance recalculado por trigger SQL a partir de las transacciones
- Color e ícono customizable
- Soft delete (`deleted_at`)

### Categorías
- Default sembradas por RPC (`seed_default_finance_categories`) al crear la primera billetera
- Custom categories con color e ícono
- Tipo: gasto o ingreso
- Soft delete (`deleted_at`) — necesario porque borrarlas físicamente cascadeaba el borrado de los presupuestos asociados

### Transacciones
- Registrar gasto, ingreso, transferencia entre billeteras, o ajuste de balance
- Campos: monto, billetera, categoría, descripción, fecha
- Carga 100% manual — **no hay clasificación automática por IA** (se borró junto con el chat de Lumus; el usuario prefiere cargar y categorizar a mano, no proponerla de nuevo salvo que la pida)
- Listado con filtros: tipo, categoría, billetera, rango de fechas
- Editar y eliminar (soft delete)
- Los ajustes de balance (`type = 'ajuste'`) no cuentan como ingreso ni gasto en los totales/KPIs

### Presupuestos
- Límite mensual por categoría
- Si el mes actual/futuro no tiene presupuestos propios, se autocopian los del mes más reciente que sí tenga (con aviso visual de "copiado")
- Delete físico (a propósito — nada más referencia esta tabla para mostrar historial)

### Vencimientos recurrentes
- Tabla `recurring_transactions` (reemplazó a la vieja `subscriptions`, que quedó huérfana sin migrar — ver `ISSUES_PENDIENTES.md`)
- Monto, billetera, categoría, tipo de repetición (diaria/semanal/mensual) y próxima fecha
- "Aplicar" genera la transacción real y avanza la próxima fecha
- Delete físico (a propósito)

### Metas de Ahorro
- Meta con nombre, monto objetivo, fecha objetivo
- Puede sumar el progreso de **varias billeteras a la vez** (tabla puente `saving_goal_wallets`) — el progreso es la suma de los balances convertidos a ARS
- Registrar aportes manuales además de o en vez del balance de billetera
- Barra de progreso, marcar como alcanzada
- Delete físico (a propósito)

### Reportes
- Ruta `/finanzas/reportes`
- Gráfico de gastos vs ingresos por mes
- Resumen mensual generado por IA (ver abajo), exportable a PDF

## IA — el único uso que queda

`/api/finance/ai-report` (`claude-sonnet-4-5`) genera un resumen de texto del mes (no un chat, no streaming) y lo guarda en `finance_reports`. Antes de llamar al proveedor, chequea si ya existe un informe para ese mes (a menos que se pida `regenerate: true`). Maneja errores del SDK con `try/catch` y no persiste respuestas vacías — ver `docs/ISSUES_PENDIENTES.md` (`F4`, cerrado) para el detalle de qué se corrigió ahí.

No hay sugerencias rápidas de chat, no hay clasificación automática de gastos, no hay contexto cruzado con otros módulos (no hay otros módulos).

## Tablas de DB

`wallets`, `finance_categories`, `transactions`, `budgets`, `recurring_transactions`, `saving_goals`, `saving_goal_wallets`, `finance_reports`.

`subscriptions` sigue en la base pero es una tabla huérfana sin código que la use — no confundir con `recurring_transactions`. Ver `docs/ISSUES_PENDIENTES.md`.
