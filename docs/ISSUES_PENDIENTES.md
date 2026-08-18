# Lumus - Issues pendientes y backlog tecnico

Fecha: 2026-08-18

Este documento lista issues detectados en la revision actual del proyecto. La idea es usarlo como backlog de trabajo: tomar un bloque, resolverlo, verificarlo y marcarlo como cerrado.

> Reescrito de punta a punta en esta fecha. La revision anterior (2026-05-21) describia un proyecto con modulos de organizacion, comidas, fit y habitos que ya no existen en el codigo (pivot a "Lumus Finanzas", commit `cf7bddd` del 2026-06-29), y una capa de chat/voz por IA que se borro por completo el 2026-08-18. La mayoria de los issues de esa revision quedaron moot como consecuencia — se documentan igual en la seccion "Issues cerrados" de mas abajo, con la razon puntual, para no perder el registro.

## Prioridad inmediata

### S3. Tabla `subscriptions` huerfana

Estado: cerrado (decision del usuario: no tocar)

Commit/fecha: 2026-08-18

Notas:
- `00010_recurring_transactions.sql` no migro ni renombro la tabla `subscriptions` — creo `recurring_transactions` como tabla nueva y separada. `subscriptions` sigue en el schema, sin ningun endpoint que la use, con 3 filas de datos reales (Seguro moto $12.500 ARS/mes, Definitiva $30.000 ARS/mes, Credito Computadora $205.000 ARS/mes — las tres con "proximo vencimiento" ya pasado).
- Consultado el usuario: **no eliminar las 3 filas**. La tabla `subscriptions` queda intacta, sin migrar ni dropear. No se toco nada de esto en el codigo ni en la base.

### S4. Tablas `marketing_*` inesperadas en el proyecto de Supabase

Estado: cerrado

Commit/fecha: 2026-08-18

Verificacion:
- `select table_name from information_schema.tables where table_schema='public'` — confirmado que las 6 tablas `marketing_*` ya no existen
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — pasan (0 errores, 14 warnings)
- Tipos de Supabase regenerados sin ninguna tabla `marketing_*`

Notas:
- Confirmado por el usuario: no era otra app compartiendo el proyecto — era un modulo de marketing de Lumus que nunca llego a tener migraciones ni codigo en este repo, y que ya no corresponde.
- Filas encontradas: 5 de las 6 tablas estaban en 0; `marketing_brand` tenia 1 fila (marca "RAdev"). Se hizo backup de esa fila (`~/lumus-dropped-modules-backup-2026-08-18/marketing_brand.json`, fuera del repo) antes de dropear.
- Dropeadas las 6 tablas en `00016_drop_marketing_module.sql`.

### F1. RPC de seed con `any`

Estado: cerrado

Commit/fecha: 2026-08-18

Verificacion:
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — pasan (0 errores, 14 warnings)
- `grep -rn "as any" src/` sin resultados

Notas:
- Se regeneraron los tipos de Supabase (`supabase gen types typescript --linked`), que ya traen las firmas de `seed_default_finance_categories` y `recompute_wallet_balance` en `Functions`.
- Se aprovecho para sacar **todos** los `as any` del proyecto, no solo el de `wallets/route.ts`: quedaban varios mas en `recurring-transactions/route.ts`, `recurring-transactions/[id]/route.ts`, `transactions/route.ts`, `transactions/[id]/route.ts` y `finanzas/page.tsx` (`recompute_wallet_balance` y consultas a `recurring_transactions`), todos por el mismo motivo — tipos desactualizados al momento de escribirlos.

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

Estado: cerrado (los dos riesgos reales resultaron ya cubiertos, no hizo falta cambiar codigo)

Commit/fecha: 2026-08-18 (solo investigacion, sin commit — nada que cambiar)

Verificacion:
- Lectura de `src/hooks/use-budgets.ts` y `src/components/modules/finanzas/finanzas-dashboard.tsx:497-502`
- Confirmado `unique(user_id, category_id, month, year)` en `budgets` desde `00001_initial_schema.sql`

Notas:
- **Senal visual**: ya existe. `finanzas-dashboard.tsx` muestra un banner ("✦ Presupuestos copiados del mes anterior...") cuando `auto_copied` viene en `true` desde la API — la revision anterior de este doc lo daba por no implementado sin verificar la UI, error mio al reescribir el documento la vez pasada.
- **Insercion duplicada ante requests concurrentes**: no es un riesgo real. La constraint unica en `budgets` hace que, si dos `GET` concurrentes intentan auto-copiar el mismo mes, el segundo insert falla (el codigo ignora ese error a proposito) y el re-fetch posterior devuelve los presupuestos ya copiados por el primero — sin duplicados.
- **Side-effect en un `GET`**: sigue siendo asi (es una eleccion de diseño, no un bug) — queda anotado por si en algun momento se prefiere una accion explicita, pero no amerita cambio sin que el usuario lo pida.

### F7. Campo `auto_classified` vestigial

Estado: cerrado

Commit/fecha: 2026-08-18

Verificacion:
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — pasan (0 errores, 14 warnings)
- `grep -rn "auto_classified" src/` sin resultados fuera de comentarios/docs

Notas:
- Columna borrada (`00015_drop_auto_classified.sql`) y limpiada de `Transaction`, los selects y los inserts en `transactions`, `wallets` (balance inicial) y `wallets/[id]/adjust`.

## Documentacion desactualizada

### D1. Docs de producto vs. alcance real

Estado: cerrado

Commit/fecha: 2026-08-18

Verificacion:
- Lectura completa de los 6 archivos reescritos
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — pasan (los cambios fueron solo de documentacion, no debian afectar nada)

Notas:
- Decision del usuario: reescribir para reflejar solo Finanzas, no mantener la vision de 8 modulos como "pausada". Esa vision queda accesible en el historial de git si algun dia se retoma.
- Reescritos de punta a punta: `README.md`, `CLAUDE.md`, `docs/LUMUS_OVERVIEW.md`, `docs/ARQUITECTURA.md`, `docs/FASES.md`, y de paso `docs/FINANZAS.md` (no estaba en la lista original de D1, pero `CLAUDE.md` lo referencia como lectura obligatoria y tenia las mismas inconsistencias — clasificacion automatica por IA, metas vinculadas a una sola billetera, `subscriptions` en vez de `recurring_transactions`).
- `docs/SCHEMA.md` no se reescribio (es largo, 712 lineas, y no estaba en el alcance pedido) — se le agrego un banner de aviso al principio marcandolo desactualizado y apuntando a `supabase/migrations/`/`database.types.ts` como fuente real.
- Los docs de modulos removidos (`AI_ARCHITECTURE.md`, `ORGANIZACION.md`, `COMIDAS.md`, `COMIDAS_V2.md`, `FIT.md`, `HABITOS.md`, `JOURNAL.md`, `RELACIONES.md`, `ESTUDIO.md`) se dejaron sin tocar, pero `README.md` ahora los marca como "históricos" en el mapa de documentacion para que no se lean como vigentes.

## Billing — items propios, no duplicados aca

El paywall de Mercado Pago tiene su propio checklist de pendientes en `docs/BILLING.md` (precio real antes de lanzar, probar el caso `paused`). No se repiten en este documento para no tener dos fuentes de verdad.

## Orden recomendado de trabajo

Todo el backlog de esta revision esta cerrado. No queda nada pendiente registrado en este documento — lo que sigue son los pendientes de `docs/BILLING.md` (precio real del plan, probar suscripcion `paused`), que no se duplican aca.

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
| `F1` RPC de seed con `any` | Cerrado — tipos regenerados, sacados todos los `as any` del proyecto — ver detalle en la seccion `F1` mas arriba |
| `F5` Presupuestos autocopiados | Cerrado — investigado, los dos riesgos reales ya estaban cubiertos (banner de aviso existente, constraint unica evita duplicados) — ver detalle en la seccion `F5` mas arriba |
| `F7` Campo `auto_classified` vestigial | Cerrado — columna borrada (`00015_drop_auto_classified.sql`) y limpiada del codigo — ver detalle en la seccion `F7` mas arriba |
| `S4` Tablas `marketing_*` inesperadas | Cerrado — confirmado por el usuario que era un modulo de Lumus que no correspondia mas; dropeadas en `00016_drop_marketing_module.sql` con backup previo de la unica fila con datos |
| `S3` Tabla `subscriptions` huerfana | Cerrado — el usuario decidio no eliminar las 3 filas; la tabla queda intacta, sin tocar |
| `D1` Docs de producto vs. alcance real | Cerrado — `README.md`, `CLAUDE.md`, `LUMUS_OVERVIEW.md`, `ARQUITECTURA.md`, `FASES.md` y `FINANZAS.md` reescritos para reflejar solo Finanzas — ver detalle en la seccion `D1` mas arriba |

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
