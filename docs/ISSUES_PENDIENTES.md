# Lumus - Issues pendientes y backlog tecnico

Fecha: 2026-08-18

Este documento lista issues detectados en la revision actual del proyecto. La idea es usarlo como backlog de trabajo: tomar un bloque, resolverlo, verificarlo y marcarlo como cerrado.

> Reescrito de punta a punta en esta fecha. La revision anterior (2026-05-21) describia un proyecto con modulos de organizacion, comidas, fit y habitos que ya no existen en el codigo (pivot a "Lumus Finanzas", commit `cf7bddd` del 2026-06-29), y una capa de chat/voz por IA que se borro por completo el 2026-08-18. La mayoria de los issues de esa revision quedaron moot como consecuencia — se documentan igual en la seccion "Issues cerrados" de mas abajo, con la razon puntual, para no perder el registro.

## Prioridad inmediata

### S3. Tabla `subscriptions` huerfana

Estado: abierto (nuevo, detectado 2026-08-18 durante la limpieza de `S1`)

Impacto: bajo (sin exposicion — RLS con policy, solo el dueno puede leer sus filas — pero es historial financiero real, no descartarlo sin mirar)

`00010_recurring_transactions.sql` no migro ni renombro la tabla `subscriptions` — creo `recurring_transactions` como tabla nueva y separada. `subscriptions` sigue en el schema, sin ningun endpoint que la use (las rutas `finance/subscriptions/*` se borraron en el pivot a "Lumus Finanzas"), pero tiene **3 filas de datos reales**: vencimientos cargados antes de la reescritura a `recurring_transactions`.

Accion sugerida:

- Revisar esas 3 filas a mano — si son vencimientos que siguen vigentes, migrarlos a `recurring_transactions` antes de tocar la tabla.
- Si ya no aplican, hacer backup (igual que se hizo para `00013_drop_unused_modules.sql`) y despues dropear la tabla en una migration separada.

### S4. Tablas `marketing_*` inesperadas en el proyecto de Supabase

Estado: abierto (nuevo, detectado 2026-08-18)

Impacto: medio — no es un bug de Lumus, pero conviene resolverlo antes de que el schema compartido crezca mas

El proyecto de Supabase de Lumus (`ccixixskklovvvikiwbq`) tiene 6 tablas que no estan en ninguna migracion de este repo: `marketing_brand`, `marketing_business_ideas`, `marketing_content_ideas`, `marketing_content_messages`, `marketing_scheduled_posts`, `marketing_slides`. No pertenecen a Lumus — parecen ser de otra aplicacion (algo de marketing/contenido) que esta usando el mismo proyecto de Supabase. `supabase gen types typescript --linked` las trae igual, asi que van a seguir apareciendo en `src/types/database.types.ts` mientras compartan el proyecto — no es un error de la generacion, es fiel a lo que hay en la base.

Accion sugerida:

- Confirmar si el proyecto se comparte a proposito (dos apps del mismo dueno ahorrando un proyecto de Supabase) o si fue sin querer.
- Si es sin querer, mover esas tablas a un proyecto de Supabase propio antes de que la otra app crezca — RLS mal configurado en una podria en teoria exponer datos de la otra si comparten el mismo `anon key`/politica de conexion.

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

Estado: cerrado

Commit/fecha: 2026-08-18

Verificacion:
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — pasan (0 errores, 14 warnings, sin cambios)
- Revision manual: `finance_categories` referenciada desde `budgets` (`on delete cascade`) y desde `transactions`/`recurring_transactions` (`on delete set null`) — confirmado en `00001_initial_schema.sql` antes de decidir

Notas:
- Se investigo entidad por entidad en vez de aplicar soft delete a las 4 por igual. Solo `finance_categories` tenia un riesgo real: borrarla fisicamente cascadeaba el borrado de **todos** los presupuestos de esa categoria (`budgets.category_id on delete cascade`) y dejaba transacciones/vencimientos historicos sin nombre/color (`on delete set null`). Se le agrego `deleted_at` (`00014_finance_categories_soft_delete.sql`) y el endpoint `DELETE /api/finance/categories/[id]` ahora hace `update({ deleted_at })` en vez de `delete()`, mismo patron que `wallets`/`transactions`. Los joins que muestran categoria en transacciones/presupuestos/vencimientos no se tocaron — al no filtrar por `deleted_at` en el embed, siguen mostrando nombre/color aunque la categoria este "borrada".
- `budgets`, `recurring_transactions` y `saving_goals` (+ `saving_goal_wallets`) se dejaron con delete fisico **a proposito** — ninguna otra tabla las referencia para mostrar historial, asi que no hay riesgo de perder datos ajenos al borrarlas. Documentado como excepcion explicita en `CLAUDE.md` para que no se vuelva a marcar como bug.
- No se toco la tabla `subscriptions` huerfana (`S3`) — es un problema distinto (datos historicos sin migrar), no de esta decision.

### F4. Reportes IA sin manejo robusto de errores

Estado: cerrado

Commit/fecha: 2026-08-18

Verificacion:
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — los tres pasan igual que antes (0 errores, 14 warnings)
- Revision manual del diff, sin correr el flujo real contra Anthropic (no hay test suite en el proyecto)

Notas:
- `/api/finance/ai-report` ahora valida `ANTHROPIC_API_KEY` antes de llamar, envuelve `anthropic.messages.create` en `try/catch` (devuelve 502 con mensaje claro en vez de dejar escalar la excepcion), y rechaza con 502 si la respuesta no trae contenido de texto en vez de guardar un informe vacio en `finance_reports`.
- De paso se corrigieron `use-finance-report.ts` y `reports-dashboard.tsx`: ambos tiraban un string generico hardcodeado ante cualquier respuesta no-ok, descartando el `error` real del body — sin este cambio, los mensajes nuevos de la API nunca hubieran llegado a la UI.
- No probado en vivo con Anthropic caido/rate-limited — la verificacion fue tipos + build + lectura de codigo.

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

1. `S4` — confirmar el origen de las tablas `marketing_*` antes de que el proyecto de Supabase compartido crezca mas.
2. `F5` — revisar UX de presupuestos autocopiados.
3. Limpieza menor: `F1` (`as any`), `F7` (campo vestigial), `S3` (tabla `subscriptions` huerfana).
4. `D1` — alinear documentacion de producto con el alcance real, cuando haya tiempo.

## Issues cerrados

### Cerrados en esta revision (2026-08-18) — funcionalidad nueva

| ID | Resolucion |
|---|---|
| Sin verificacion de email | Cerrado — flujo de codigo de 6 digitos por Resend, ver `docs/ESTADO_ACTUAL.md` |
| Sin recuperacion de contrasena | Cerrado — `/forgot-password` + `/reset-password` |
| Sin paywall | Cerrado — Mercado Pago Suscripciones, ver `docs/BILLING.md` |
| `S1` RLS sin policies en tablas de modulos removidos | Cerrado — se dropearon las 28 tablas sin uso en `00013_drop_unused_modules.sql`, con backup previo de las 13 que tenian datos reales (`~/lumus-dropped-modules-backup-2026-08-18/`, fuera del repo) |
| `F4` Reportes IA sin manejo robusto de errores | Cerrado — ver detalle en la seccion `F4` mas arriba |
| `F3` Borrados fisicos en entidades financieras | Cerrado — soft delete solo para `finance_categories` (era la unica con riesgo real de cascada/orfandad), fisico documentado como excepcion a proposito para el resto — ver detalle en la seccion `F3` mas arriba |

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
