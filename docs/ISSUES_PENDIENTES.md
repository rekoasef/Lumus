# Lumus - Issues pendientes y backlog tecnico

Fecha: 2026-05-21

Este documento lista issues detectados en la revision actual del proyecto. La idea es usarlo como backlog de trabajo: tomar un bloque, resolverlo, verificarlo y marcarlo como cerrado.

## Prioridad inmediata

### 1. Drift de schema en tareas agendadas

Estado: cerrado

Impacto: alto

El codigo usa `tasks.start_time` y `tasks.duration_minutes` en dashboard, organizacion, tipos y API routes. Al revisar, no existia una migration versionada que agregara esas columnas.

Riesgo:

- Resuelto para bases nuevas con `00006_task_time_blocks.sql`.

Accion sugerida:

- Cerrado con `supabase/migrations/00006_task_time_blocks.sql`.
- La migration agrega:
  - `tasks.start_time time`
  - `tasks.duration_minutes int`
- Tambien agrega un check para `duration_minutes` entre 5 y 480 minutos cuando no es null.
- Verificado con `npm run lint`, `npx tsc --noEmit` y `npm run build`.

### 2. Lint bloqueante

Estado: cerrado

Impacto: alto

`npm run lint` ya no falla. Quedan warnings no bloqueantes.

Errores principales resueltos:

- Uso de `Date.now()` durante render en pages/componentes/hooks.
- `setState` sincronico dentro de effects.
- Comillas sin escapar en JSX.

Archivos destacados:

- `src/app/(dashboard)/comidas/page.tsx`
- `src/app/(dashboard)/fit/page.tsx`
- `src/components/modules/comidas/meal-log-section.tsx`
- `src/hooks/use-workout-sessions.ts`
- `src/components/lumus/lumus-chat.tsx`
- `src/components/modules/dashboard/currency-widget.tsx`
- `src/components/modules/dashboard/live-clock.tsx`
- `src/components/modules/dashboard/weather-widget.tsx`
- `src/components/lumus/lumus-fullscreen.tsx`
- `src/components/lumus/voice-modal.tsx`

Accion sugerida:

- Cerrado: errores resueltos.
- Resultado actual: 0 errores, 25 warnings.
- Quedan warnings de deuda tecnica, principalmente React Hook Form `watch()` marcado por React Compiler y variables sin usar.

### 3. Rutas enlazadas sin pagina

Estado: abierto

Impacto: medio

La navegacion apunta a rutas no implementadas:

- `/journal`
- `/relaciones`
- `/estudio`

Accion sugerida:

- Opcion A: crear paginas placeholder consistentes con `habitos`.
- Opcion B: ocultar temporalmente esos links hasta implementar los modulos.

## Foco proximo: Finanzas

Estos issues son los mas relevantes si el desarrollo se concentra en el modulo de finanzas.

### F1. RPC de seed con `any`

Estado: abierto

Impacto: bajo/medio

En `src/app/api/finance/wallets/route.ts` se usa:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await (supabase.rpc as any)('seed_default_finance_categories', { p_user_id: user.id })
```

Accion sugerida:

- Regenerar tipos Supabase incluyendo funciones RPC.
- Quitar `as any` y el disable de ESLint.

### F2. Endpoint legacy de clasificacion

Estado: abierto

Impacto: medio

Existen dos endpoints de clasificacion:

- `/api/ai/classify`: categorias hardcodeadas.
- `/api/ai/classify-transaction`: categorias reales del usuario con cache.

Accion sugerida:

- Confirmar cual usa la UI actual.
- Migrar todo a `/api/ai/classify-transaction`.
- Eliminar o deprecar `/api/ai/classify` para evitar logicas divergentes.

### F3. Borrados fisicos en entidades financieras

Estado: abierto

Impacto: medio

Hay deletes fisicos en:

- `finance/categories/[id]`
- `finance/budgets/[id]`
- `finance/subscriptions/[id]`
- `finance/saving-goals/[id]`

Esto no rompe el schema actual, pero contradice la regla general documentada de soft delete.

Accion sugerida:

- Decidir por entidad si requiere historial.
- Si se necesita historial, agregar `deleted_at` en migrations y migrar endpoints a soft delete.
- Si se mantiene delete fisico, actualizar docs para no dejar una regla falsa.

### F4. Reportes IA sin manejo robusto de errores

Estado: abierto

Impacto: medio

`/api/finance/ai-report` llama Anthropic y guarda informe, pero no maneja bien fallos de proveedor, falta de API key o contenido vacio.

Accion sugerida:

- Validar `ANTHROPIC_API_KEY` antes de llamar.
- Envolver llamada en `try/catch`.
- Devolver errores claros para UI.
- Considerar guardar estado de generacion si despues se vuelve asincronico.

### F5. Presupuestos autocopiados

Estado: revisar

Impacto: medio

`/api/finance/budgets` autocopia presupuestos del mes mas reciente si el mes pedido no tiene presupuestos y es actual/futuro.

Accion sugerida:

- Verificar UX: el usuario debe entender cuando un presupuesto fue copiado.
- Confirmar si esta logica debe ejecutarse en `GET` o si conviene accion explicita.
- Revisar si puede insertar duplicados ante requests simultaneos.

### F6. Balance de billeteras y ajustes

Estado: cerrado

Impacto: alto

El balance se recalcula por trigger a partir de transacciones. El ajuste de balance queda como transaccion interna `ajuste` con `amount` firmado: positivo suma saldo, negativo resta saldo. No se clasifica como `ingreso` ni `gasto`, por lo que no impacta KPIs, reportes ni resumen mensual.

Accion sugerida:

- Cerrado con `supabase/migrations/00007_balance_adjustments_not_income_expense.sql`.
- El endpoint de ajuste y el alta de billeteras con balance inicial ahora crean movimientos `ajuste`.
- La UI muestra estos movimientos como ajustes de balance y oculta la edicion normal para evitar convertirlos en gastos/ingresos por accidente.
- La migration convierte ajustes historicos con descripcion `Balance inicial` o `Ajuste de balance%` y sin categoria desde `gasto`/`ingreso` a `ajuste`.

## Foco proximo: Voz e inteligencia de Lumus

Estos issues son relevantes para mejorar voz, chat e IA contextual.

### AI1. Manejo de errores en llamadas a modelos

Estado: abierto

Impacto: alto

Rutas afectadas:

- `/api/ai/chat`
- `/api/ai/voice-stream`
- `/api/ai/tts`
- `/api/ai/classify-transaction`
- `/api/food/recipes/generate`
- `/api/finance/ai-report`

Accion sugerida:

- Validar env vars requeridas.
- Envolver llamadas a proveedores en `try/catch`.
- Devolver mensajes de error consistentes.
- Loguear errores de servidor sin exponer secrets.

### AI2. Cache de IA con parseos fragiles

Estado: abierto

Impacto: medio

`classify-transaction` parsea JSON cacheado sin try/catch. Si el cache se corrompe, el endpoint falla.

Accion sugerida:

- Agregar `try/catch`.
- Si falla el parseo, regenerar respuesta y sobrescribir cache.

### AI3. Cache key de recetas por slice de prompt

Estado: abierto

Impacto: medio

`recipes/generate` usa `recipe_gen_${prompt.slice(0, 100)}` como cache key.

Riesgo:

- Colisiones entre prompts parecidos.
- Keys largas o con caracteres innecesarios.

Accion sugerida:

- Usar `generateCacheKey(user.id, 'comidas', prompt)` o hash equivalente.

### AI4. Context Builder con `.single()` en datos opcionales

Estado: abierto

Impacto: bajo/medio

`buildUserSnapshot` usa `.single()` para `user_profiles`, `user_life_summary` y `user_context_cache`. Si falta la fila, Supabase devuelve error.

Accion sugerida:

- Usar `.maybeSingle()` en datos opcionales.
- Manejar explicitamente perfil faltante.
- Revisar si onboarding debe generar cache inicial.

### AI5. Semana del snapshot mal calculada

Estado: abierto

Impacto: bajo

La semana se arma como `hoy-hoy+6` sin considerar fin de mes ni inicio real de semana.

Accion sugerida:

- Calcular lunes-domingo o rango real de 7 dias con fechas validas.

### AI6. Voz: estado y streaming

Estado: revisar

Impacto: medio/alto

La voz usa:

- `use-voice-lumus.ts`
- `/api/ai/voice-stream`
- `/api/ai/tts`
- `VoiceModal`
- `LumusFullscreen`

Issues detectados:

- Lint por dependency faltante en `useVoiceLumus`.
- `voice-stream` guarda conversacion en background sin esperar resultado.
- `chat` y `voice-stream` tienen prompts de voz similares pero duplicados.

Accion sugerida:

- Unificar reglas de voz en helper compartido.
- Revisar cambio de voz por tag `[VOZ:nombre]`.
- Mejorar fallback si TTS falla.
- Verificar experiencia end-to-end: microfono -> stream texto -> audio -> cambio de voz.

### AI7. Estado del orb/chat

Estado: cerrado

Impacto: medio

`lumus-chat.tsx` fallaba lint por `setOrbState` dentro de effect.

Accion sugerida:

- Cerrado: el estado del orb ahora se deriva desde `isLoading` y el ultimo mensaje.
- Verificado con `npm run lint`, `npx tsc --noEmit` y `npm run build`.

## Seguridad y RLS

### S1. Policies faltantes en tablas puente

Estado: abierto

Impacto: alto

Tablas con RLS habilitado y sin policy directa detectada:

- `task_label_assignments`
- `workout_routine_exercises`
- `workout_session_logs`

Accion sugerida:

- Crear policies basadas en ownership por join.
- Verificar inserts/selects anidados en rutinas y labels.

### S2. Endpoints con body libre

Estado: abierto

Impacto: medio

Endpoints afectados:

- `src/app/api/food/shopping-list/[id]/route.ts`
- `src/app/api/fit/sessions/[id]/route.ts`

Accion sugerida:

- Crear schemas Zod de update.
- Filtrar solo campos permitidos.
- Evitar que el cliente mande columnas no esperadas.

## Documentacion desactualizada

### D1. Stack y estructura objetivo vs realidad

Estado: abierto

Impacto: medio

Docs anteriores mencionan:

- Next.js 14+ en vez de Next.js 16.
- Vitest y carpeta `tests/`, que no existen.
- `tailwind.config.ts`, que no existe.
- `docs/modulos/*`, pero los docs reales de modulo estan en `docs/*.md`.
- Rutas de modulos futuros como si ya existieran.

Accion sugerida:

- Actualizar `README.md`, `CLAUDE.md`, `LUMUS_OVERVIEW.md`, `ARQUITECTURA.md` y `FASES.md`.
- Mantener `docs/ESTADO_ACTUAL.md` como snapshot y usar este archivo para seguimiento.

## Orden recomendado de trabajo

Para avanzar con Finanzas + Voz/IA sin arrastrar deuda base:

1. Resolver `S2` endpoints con body libre.
2. Revisar rutas faltantes o ajustar la navegacion.
3. Atacar Finanzas:
   - F6 balance/ajustes;
   - F2 clasificacion;
   - F4 reportes IA;
   - F5 presupuestos.
4. Atacar Voz/IA:
   - AI1 errores de proveedores;
   - AI6 flujo de voz;
   - AI4 contexto.
5. Limpiar warnings no bloqueantes de lint si se quiere salida completamente limpia.

## Estado de seguimiento

Formato sugerido al cerrar un issue:

```md
Estado: cerrado
Commit/fecha: YYYY-MM-DD
Verificacion:
- comando o flujo manual probado
Notas:
- decisiones tomadas
```
