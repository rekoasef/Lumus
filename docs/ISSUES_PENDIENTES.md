# Lumus - Issues pendientes y backlog tecnico

Fecha: 2026-08-18

Este documento lista issues detectados en la revision actual del proyecto. La idea es usarlo como backlog de trabajo: tomar un bloque, resolverlo, verificarlo y marcarlo como cerrado.

> Reescrito de punta a punta en esta fecha. La revision anterior (2026-05-21) describia un proyecto con modulos de organizacion, comidas, fit y habitos que ya no existen en el codigo (pivot a "Lumus Finanzas", commit `cf7bddd` del 2026-06-29), y una capa de chat/voz por IA que se borro por completo el 2026-08-18. La mayoria de los issues de esa revision quedaron moot como consecuencia — se documentan igual en la seccion "Issues cerrados" de mas abajo, con la razon puntual, para no perder el registro.

## Prioridad inmediata

### S1. RLS sin policies en tablas de modulos removidos

Estado: abierto (reclasificado — antes "Alta", ahora "Baja")

Impacto: bajo hoy, media si se decide revivir esos modulos

Tablas con RLS habilitado y sin ninguna `create policy`:

- `task_label_assignments`
- `workout_routine_exercises`
- `workout_session_logs`

Estas tablas pertenecen a los modulos de organizacion/fit que se borraron del codigo en el pivot a "Lumus Finanzas". Importante: en Postgres, RLS habilitado sin policies es **deny-all por default** — nadie puede leer ni escribir esas filas via la API de Supabase (ni siquiera el dueno), asi que no hay exposicion de datos activa. La revision anterior las marcaba "Impacto: alto" asumiendo que el codigo todavia las tocaba; ya no es el caso.

Accion sugerida:

- No es urgente arreglar las policies (nada las usa).
- Decidir si estas tablas se van a usar de nuevo (revivir organizacion/fit) o si conviene una migracion de limpieza que las borre junto con el resto del schema muerto (ver seccion "Schema muerto" en `docs/ESTADO_ACTUAL.md`).

### F1. RPC de seed con `any`

Estado: abierto

Impacto: bajo/medio

En `src/app/api/finance/wallets/route.ts`:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await (supabase.rpc as any)('seed_default_finance_categories', { p_user_id: user.id })
```

Accion sugerida:

- Regenerar tipos Supabase incluyendo funciones RPC (`supabase gen types typescript` con el proyecto linkeado trae las firmas de funciones).
- Quitar `as any` y el disable de ESLint.

### F3. Borrados fisicos en entidades financieras

Estado: abierto

Impacto: medio

Hay deletes fisicos en:

- `finance/categories/[id]`
- `finance/budgets/[id]`
- `finance/recurring-transactions/[id]` (antes `finance/subscriptions/[id]`, renombrado en `00010_recurring_transactions.sql`)
- `finance/saving-goals/[id]`

`finance/transactions/[id]` y `finance/wallets/[id]` si hacen soft delete (`deleted_at`). Esto no rompe el schema actual, pero contradice la regla general de `CLAUDE.md` ("Nunca borrar fisicamente — siempre soft delete") y es inconsistente entre endpoints hermanos.

Accion sugerida:

- Decidir por entidad si requiere historial (ej: una categoria borrada que tenia transacciones asociadas — se pierde el nombre/color al hacer delete fisico si no hay `ON DELETE SET NULL` o similar; verificar el comportamiento actual antes de decidir).
- Si se necesita historial, agregar `deleted_at` en una migration y migrar esos 4 endpoints a soft delete.
- Si se mantiene delete fisico para alguna, dejarlo documentado como excepcion explicita en `CLAUDE.md` para no repetir la regla falsa.

### F4. Reportes IA sin manejo robusto de errores

Estado: abierto

Impacto: medio-alto (es el unico endpoint de IA que queda activo, y el usuario ya paga por la app)

`/api/finance/ai-report` llama a Anthropic (`claude-sonnet-4-5`) y guarda el informe en `finance_reports`, pero no valida `ANTHROPIC_API_KEY` antes de llamar ni envuelve la llamada en `try/catch`.

Accion sugerida:

- Validar `ANTHROPIC_API_KEY` antes de llamar.
- Envolver la llamada en `try/catch`.
- Devolver errores claros para la UI (hoy un fallo de proveedor tira 500 generico).
- Considerar guardar estado de generacion si en algun momento se vuelve asincronico.

### F5. Presupuestos autocopiados

Estado: revisar

Impacto: medio

`/api/finance/budgets` (`GET`) autocopia presupuestos del mes mas reciente si el mes pedido no tiene presupuestos propios y es actual/futuro — sigue asi, sin cambios desde la revision anterior.

Accion sugerida:

- Verificar UX: el usuario debe entender cuando un presupuesto fue copiado (hoy no hay ninguna senal visual de que un presupuesto es "heredado" vs. creado a mano ese mes).
- Confirmar si esta logica debe ejecutarse en `GET` (side-effect en una lectura) o si conviene una accion explicita ("copiar presupuestos del mes anterior").
- Revisar si puede insertar duplicados ante requests simultaneos (dos `GET` en paralelo al mismo mes sin presupuestos podrian copiar dos veces).

### F7. Campo `auto_classified` vestigial

Estado: abierto (nuevo, detectado 2026-08-18)

Impacto: bajo

`transactions.auto_classified` sigue en el schema, el tipo `Transaction` y los selects de la API, pero desde que se borro el modulo de IA (clasificacion automatica via `gpt-4o-mini`) ningun endpoint lo pone en `true` — solo queda el `false` explicito al crear transacciones manuales. La UI que mostraba el iconito de "clasificado por IA" (`Sparkles` en `transaction-item.tsx`) tambien se saco.

Accion sugerida:

- Si no se va a revivir la clasificacion automatica (el usuario prefiere carga manual — ver memoria del proyecto), sacar la columna en una migration y limpiar el campo de `Transaction`, los selects y el `POST` de `transactions/route.ts`.
- Si se deja para el futuro, al menos anotarlo como "reservado, sin uso actual" en `docs/SCHEMA.md`.

## Documentacion desactualizada

### D1. Docs de producto vs. alcance real

Estado: abierto

Impacto: medio

`CLAUDE.md`, `LUMUS_OVERVIEW.md`, `ARQUITECTURA.md` y `FASES.md` todavia describen a Lumus como el "Sistema Operativo Personal" original (organizacion, finanzas, comidas, salud, habitos, journal, relaciones, estudio + IA contextual en cada modulo). El producto real desde el 2026-06-29 es una app de finanzas personales con paywall — sin esos otros modulos ni el chat/voz de IA.

`docs/ESTADO_ACTUAL.md` (actualizado junto con este archivo) ya refleja el estado real y puede usarse como fuente de verdad mientras tanto.

Accion sugerida:

- Actualizar `README.md`, `CLAUDE.md`, `LUMUS_OVERVIEW.md`, `ARQUITECTURA.md` y `FASES.md` para que el alcance de producto coincida con lo que existe, o decidir explicitamente "esto es una pausa, el plan sigue siendo el OS completo" y dejarlo anotado.

## Billing — items propios, no duplicados aca

El paywall de Mercado Pago tiene su propio checklist de pendientes en `docs/BILLING.md` (precio real antes de lanzar, probar el caso `paused`). No se repiten en este documento para no tener dos fuentes de verdad.

## Orden recomendado de trabajo

1. `S1` — decidir el destino del schema muerto (revivir modulos o migracion de limpieza). No es urgente pero desbloquea la decision de si vale la pena arreglar las policies.
2. `F4` — manejo de errores en reportes IA, es el endpoint de IA que queda vivo y el usuario ya paga por la app.
3. `F3` — consistencia de soft delete entre entidades financieras.
4. `F5` — revisar UX de presupuestos autocopiados.
5. Limpieza menor: `F1` (`as any`), `F7` (campo vestigial).
6. `D1` — alinear documentacion de producto con el alcance real, cuando haya tiempo.

## Issues cerrados

### Cerrados en esta revision (2026-08-18) — funcionalidad nueva

| ID | Resolucion |
|---|---|
| Sin verificacion de email | Cerrado — flujo de codigo de 6 digitos por Resend, ver `docs/ESTADO_ACTUAL.md` |
| Sin recuperacion de contrasena | Cerrado — `/forgot-password` + `/reset-password` |
| Sin paywall | Cerrado — Mercado Pago Suscripciones, ver `docs/BILLING.md` |

### Cerrados en esta revision (2026-08-18) — moot por borrado de codigo

| ID original (revision 2026-05-21) | Por que quedo moot |
|---|---|
| `#3` Rutas `/journal`, `/relaciones`, `/estudio` sin pagina | Se sacaron los links de la navegacion (y tambien los de `/comidas`, `/fit`, `/habitos`, `/organizacion`, removidos en el pivot de junio) en vez de crear placeholders |
| `F2` Endpoint legacy `/api/ai/classify` a deprecar | Se borro el modulo de clasificacion por IA completo (`/api/ai/classify` y `/api/ai/classify-transaction` ya no existen) |
| `AI1` Manejo de errores en llamadas a modelos | Rutas afectadas (`/api/ai/chat`, `/api/ai/voice-stream`, `/api/ai/tts`, `/api/ai/classify-transaction`, `/api/food/recipes/generate`) no existen mas — `/api/finance/ai-report` sigue vivo, ver `F4` |
| `AI2` Cache de IA con parseos fragiles | `classify-transaction` no existe mas |
| `AI3` Cache key de recetas por slice de prompt | `/api/food/recipes/generate` no existe mas |
| `AI4` Context Builder con `.single()` en datos opcionales | `src/lib/ai/context-builder.ts` se borro entero |
| `AI5` Semana del snapshot mal calculada | Mismo archivo borrado |
| `AI6` Voz: estado y streaming | `use-voice-lumus.ts`, `voice-stream`, `tts`, `VoiceModal`, `LumusFullscreen` se borraron enteros |
| `S2` Endpoints con body libre (`shopping-list`, `fit/sessions`) | Los modulos de comidas y fit se borraron enteros, esos archivos no existen |

### Cerrados en revisiones anteriores (sin cambios)

| ID | Resolucion |
|---|---|
| `#1` Drift schema tareas | `00006_task_time_blocks.sql` |
| `#2` Lint bloqueante | Resuelto, 0 errores (hoy 14 warnings, bajaron de ~25 tras el borrado del chat/voz) |
| `F6` Balance y ajustes | `00007_balance_adjustments_not_income_expense.sql` |
| `AI7` Estado del orb/chat | Moot ademas — el componente que tenia el bug (`lumus-chat.tsx`) se borro |

---

## Formato para cerrar un issue

```md
Estado: cerrado
Commit/fecha: YYYY-MM-DD
Verificacion:
- comando o flujo manual probado
Notas:
- decisiones tomadas
```
