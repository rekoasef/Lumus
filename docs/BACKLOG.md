# Lumus — Backlog de trabajo

Última revisión: 2026-08-27

Este es el backlog vivo del proyecto. Se organiza en **rondas**: cada ronda es un conjunto acotado de tickets que se toman **de a uno**, se cierran, se verifican y recién ahí se pasa al siguiente. Las rondas cerradas quedan abajo como historial, no se borran.

- **Ronda 2 (`C1`–`C8`)** — abierta, 2026-08-26. Es la que está en curso.
- **Ronda 1 (`B1`–`B7`)** — cerrada y deployada el 2026-08-20. Más abajo.

> **El deploy es manual** (`vercel --prod --yes`) y la base y el código deployado tienen que moverse juntos. El 2026-08-20 quedaron desfasados unos minutos y eso dejó al dueño fuera de su propia app hasta el deploy siguiente. Si un ticket toca el gate de acceso o una migración, deployar en el mismo tramo.

---

# Ronda 2 — abierta (2026-08-26)

Siete tickets, ordenados por severidad y dependencia, no por ganas. El criterio de orden: primero lo que hoy **muestra datos incorrectos**, después lo que da **red para deployar el resto**, después lo que agrega **valor de producto**, y al final lo que depende de una decisión de negocio.

## Orden de trabajo

| # | Ticket | Por qué está en esa posición | Tamaño |
|---|---|---|---|
| ~~`C1`~~ | ~~Transacciones por rango en vez de tope fijo~~ | **Cerrado 2026-08-26** | M |
| ~~`C2`~~ | ~~Errores de producción visibles (Sentry)~~ | **Cerrado 2026-08-27** | S |
| ~~`C3`~~ | ~~Lógica financiera en un solo lugar + primeros tests~~ | **Cerrado 2026-08-27** | M |
| ~~`C4`~~ | ~~Motor de avisos + vencimientos por mail~~ | **Cerrado 2026-08-27** | M |
| `C5` | Centro de notificaciones in-app + resto de los avisos | Depende del motor de `C4`. Sin él, cada aviso nuevo se implementa desde cero | M |
| `C6` | PWA instalable + carga rápida de gasto | Impacto alto en uso real, nada depende de él. Se puede adelantar si hay poco tiempo | S |
| `C7` | Importador de CSV con mapeo manual | El más grande. Va último de los de producto porque es el que más superficie nueva agrega | L |
| `C8` | Cerrar el paywall | **No depende de ningún otro ticket, depende de una decisión tuya** (el precio). Se puede adelantar en cualquier momento | M |

Tamaños: `S` ≈ media jornada · `M` ≈ una jornada · `L` ≈ dos o más.

---

## `C1` — Transacciones por rango en vez de tope fijo

Estado: **cerrado** — 2026-08-26 (`00021_finance_summary.sql`)

### Por qué

`/finanzas` carga las **500** transacciones más recientes (`src/app/(dashboard)/finanzas/page.tsx:42`) y `/dashboard` las **400** (`src/app/(dashboard)/dashboard/page.tsx:148`). Todo el filtrado por día/semana/mes/**año**/período de `transaction-list.tsx` corre en el cliente, sobre ese array ya recortado.

Hoy hay **723 transacciones activas** del dueño. Ya se pasó el tope. Cuando alguien filtra por un año entero, la UI no dice "faltan datos": muestra un total **incompleto y perfectamente creíble**. En una app de finanzas ese es el peor modo de falla posible — un número mal que parece bien.

La API ya acepta `date_from` y `date_to` (`src/app/api/finance/transactions/route.ts:14-15`), pero `src/hooks/use-transactions.ts` **nunca los usa**: arranca con lo que le pasó el server component y no vuelve a pedir nada cuando cambia el período.

### Alcance

1. `use-transactions.ts` acepta un rango y refetchea cuando cambia. El cambio de período en `transaction-list.tsx` deja de filtrar en memoria y dispara el fetch.
2. El server component de `/finanzas` deja de traer un tope fijo y trae **el período visible por default** (el mes actual).
3. Los KPIs del dashboard salen de **agregados en SQL** (una RPC que devuelva totales por categoría y por mes), no de traer filas para sumarlas en JS. Hoy `/dashboard` transfiere 400 transacciones para mostrar 6 y cuatro totales.
4. Estado de carga visible al cambiar de período: si el fetch tarda, no se puede mostrar el total viejo como si fuera el nuevo.

### Riesgos

- **El filtro "período" permite rangos arbitrarios.** Un rango de 5 años puede traer miles de filas. Definir un tope duro por request y, si se alcanza, **decirlo en la UI** — que es exactamente lo que hoy no pasa.
- La RPC nueva es `SECURITY INVOKER` o filtra por `auth.uid()`, igual que `merge_finance_categories` (`00020`). No repetir el problema que arregló `00017`.
- Las transacciones borradas (`deleted_at`) siguen quedando afuera de todos los agregados.

### Done cuando

- Filtrar por un año con más de 500 transacciones cargadas muestra el total **completo** — verificado contra un `select sum(amount)` en la base.
- Ningún endpoint ni server component trae filas solo para sumarlas.
- Si un rango excede el tope, la UI lo dice.

### Resultado (2026-08-26)

**El bug medido antes de tocar nada**: con 741 transacciones activas, el tope de 500 de `/finanzas` cortaba en `2025-05-15`. Filtrar por "2025" dejaba **53 gastos afuera del total**, sin ningún aviso. Todo 2024 y 2023 directamente no existía para la pantalla. El tope de 400 de `/dashboard` cortaba en `2025-11-15`.

**Lo que se hizo**:

| Pieza | Qué |
|---|---|
| `00021_finance_summary.sql` | `get_finance_summary(p_from, p_to)` — totales por tipo + categoría + moneda. `SECURITY INVOKER`, así que RLS sigue aplicando; `EXECUTE` revocado a `public`/`anon` como en `00017`. Índice parcial `(user_id, date) where deleted_at is null` |
| `GET /api/finance/summary` | El agregado, validado con Zod |
| `GET /api/finance/transactions` | Tope duro de 500 con `truncated` en la respuesta: pide una fila de más para saber si quedó cortado. Acepta `category_id=none` para los movimientos sin categoría |
| `lib/finance/summary.ts` | Funciones puras que pliegan el agregado (total en ARS, conteo, totales por categoría). Se adelanta parte de `C3` |
| `use-finance-summary` / `use-transaction-rows` | Hooks nuevos. `loading` es **derivado** ("lo que tengo es de otro rango"), no un estado propio: es lo que garantiza que no se muestren los totales del período anterior mientras carga el nuevo |
| `transaction-list.tsx` | Donut, totales y lista de categorías salen del agregado. Las filas se piden **solo** al entrar al detalle de una categoría |
| `finanzas/page.tsx` | Ya no trae 500 transacciones: trae el agregado del mes. Lo gastado por presupuesto sale de ahí, en vez de una segunda query de filas |
| `dashboard/page.tsx` | Ya no trae 400 transacciones: trae el agregado del mes y **6** movimientos, los que muestra |

**Se cambió de raíz cómo se dibuja la pantalla**: la vista principal de Movimientos no transfiere ninguna transacción. Antes, cada carga de `/finanzas` mandaba 500 filas por la red para renderizar un donut y una lista de categorías.

**Verificación**:

| Qué | Resultado |
|---|---|
| Totales de 2025 por el camino real (rol `authenticated`, RLS, `set request.jwt.claims`) | Gasto **12.386.728** en 172 movimientos, ingreso **14.991.220** en 25 — idéntico al `sum(amount)` de la base |
| Peso de esa misma respuesta | **26 filas** agregadas en vez de 172 transacciones |
| `anon` llamando a la función | `permission denied for function get_finance_summary` |
| `npx tsc --noEmit` / `npm run lint` / `npm run build` | Sin errores; 12 warnings, igual que el baseline |

**Dos decisiones que valen la pena anotar**:

1. **La conversión a ARS no se hace en SQL.** El agregado agrupa por moneda y el cliente convierte con la cotización de `useExchangeRates`; la base no conoce el dólar blue. Efecto colateral: la lista de movimientos ahora **convierte** en vez de sumar pesos con dólares como si fueran lo mismo.
2. **El nombre de una categoría borrada se sigue mostrando.** El agregado devuelve `category_id` a secas, así que las páginas cargan aparte un lookup de categorías **sin** filtrar `deleted_at` — si no, un gasto viejo de una categoría borrada aparecería como "Sin categoría".

**Lo que no se hizo**: el detalle de una categoría sigue teniendo un tope (500 filas), ahora explícito y avisado en pantalla ("se listan los 500 más recientes de N"). El total de ese detalle sale del agregado, así que es completo aunque la lista esté cortada. Paginar el detalle no hacía falta para cerrar el bug y agregaba superficie.

---

## `C2` — Errores de producción visibles (Sentry)

Estado: **cerrado (2026-08-27)**

### Por qué

No hay Sentry, ni logging, ni nada (`package.json` no tiene ninguna dependencia de observabilidad). Con dos usuarios reales, **el único canal de detección de errores es que a alguien se le ocurra apretar el botón de feedback**. Un error de servidor en `/api/finance/transactions` a las 3 de la mañana no deja rastro en ningún lado.

Va segundo a propósito: los cinco tickets que siguen tocan plata, mails y facturación. Conviene tener la red puesta antes.

### Alcance

- Sentry en el plan free (5k errores/mes alcanza de sobra para 2 usuarios), con `@sentry/nextjs`: cliente, server y edge.
- **Scrubbing de datos sensibles**: montos, descripciones de transacciones y mails no van al breadcrumb. Un stack trace sirve igual sin el detalle financiero de nadie.
- Alerta por mail solo para errores nuevos, no para cada ocurrencia repetida.
- `SENTRY_DSN` **en Vercel**, no solo en `.env.local`. La lección de `RESEND_API_KEY` en la ronda 1: funcionó en local y no habría enviado nada en producción, en silencio.

### Riesgos

- El bundle del cliente crece. Si molesta, arrancar solo con el lado server, que es donde están los errores que hoy no se ven.
- Sentry captura los errores de Next 16 con App Router de forma distinta según la versión del SDK — verificar contra la doc actual, no de memoria.

### Done cuando

- Un error forzado en una API route aparece en Sentry **desde producción**, no desde local.
- El evento capturado no contiene montos, descripciones ni mails.

### Resultado (2026-08-27)

**Lo que se hizo**:

| Pieza | Qué |
|---|---|
| `lib/observability/sentry.ts` | Toda la configuración y el scrubbing, compartidos por los tres runtimes |
| `src/instrumentation.ts` | `register()` + `onRequestError = Sentry.captureRequestError` — el hook de Next 15+ que hace que un error de una API route o un Server Component llegue a Sentry |
| `src/sentry.server.config.ts` · `src/sentry.edge.config.ts` · `src/instrumentation-client.ts` | Los tres `init`, todos con la misma config |
| `src/app/global-error.tsx` | No existía ningún boundary raíz. Reporta a Sentry y muestra una pantalla de la app en vez del error crudo de Next |
| `next.config.ts` | `withSentryConfig` |

**El scrubbing es el grueso del ticket.** Los defaults del SDK adjuntan bodies, cookies, headers, query strings y **las variables locales de cada frame del stack** — que en un handler de transacciones son, literalmente, el monto y la descripción. Se apagan con `dataCollection` (`userInfo: false`, `httpBodies: []`, `cookies: false`, `httpHeaders: false`, `urlQueryParams: false`, `stackFrameVariables: false`, `databaseQueryData: false`), y encima `beforeSend` y `beforeBreadcrumb` limpian lo que igual se cuele. Los breadcrumbs de consola se descartan enteros: las API routes hacen `console.error` del error crudo de Supabase, que a veces trae la fila que se intentó insertar.

**Verificación**:

| Qué | Resultado |
|---|---|
| Prueba local contra un sink falso | Se disparó un error con `128450.75`, `Supermercado Coto — compra semanal` y un mail metidos a propósito en un `console.error` y en variables locales. El evento llegó con **cero coincidencias**: sin `request.data`, sin cookies, sin headers, sin query string, sin breadcrumbs y con **0 frames con `vars`** |
| Prueba desde producción | `/api/debug/sentry-check` (ruta temporal, ya borrada) devolvió 500 y el issue apareció en Sentry con stack trace y sin panel de variables locales |
| DSN en el bundle de producción | Confirmado: el chunk servido por `www.gestorlumus.site` tiene el host de ingest |
| `npm test` / `npx tsc --noEmit` / `npm run lint` / `npm run build` | Sin errores |

**Cuatro decisiones que valen la pena anotar**:

1. **Sin Session Replay.** Graba la pantalla del usuario, o sea todo su detalle financiero. Es exactamente lo que el resto del ticket se ocupa de no mandar.
2. **Sin tracing** (`tracesSampleRate: 0`). Lo que falta es ver errores, no performance, y cada transacción manda la URL completa de cada request.
3. **Sin `tunnelRoute`.** Esquivaría a los bloqueadores de publicidad, pero abre una ruta en nuestro dominio que `proxy.ts` gatea con el resto — habría que hacerle un agujero al gate de auth. Con dos usuarios conocidos no lo vale.
4. **`disableLogger` y `automaticVercelMonitors` quedaron afuera**: son opciones de webpack y Next 16 buildea con Turbopack, así que lo único que hacían era imprimir un warning de deprecación en cada build.

**Lo que no se hizo**: no se subieron source maps. Los stack traces de producción apuntan al chunk compilado (`chunks/[root-of-the-server]__117vqp8._.js:2:1484`), que ubica el error pero no la línea de código. Para arreglarlo hace falta un `SENTRY_AUTH_TOKEN` con permiso `project:releases`; `next.config.ts` ya lo lee si está. Tampoco se configuró la alerta por mail — se hace en el dashboard de Sentry, no en el repo.

---

## `C3` — Lógica financiera en un solo lugar + primeros tests

Estado: **cerrado (2026-08-27)**

### Por qué

El bug del 2026-08-26 (`857a6cb`) es el síntoma: el progreso de una meta de ahorro estaba calculado en **dos lugares con reglas distintas** — `saving-goal-card.tsx` sumaba las billeteras vinculadas, el dashboard leía `current_amount` a pelo. Resultado: la misma meta, 62% en una pantalla y 0% en la otra.

No es un caso aislado. Existe `src/lib/utils/format-currency.ts` y aun así **9 componentes** definen su propio `Intl.NumberFormat` local, cada uno con sus decisiones de decimales.

Va antes que `C4`, `C5` y `C7` porque los tres van a necesitar estas mismas reglas. Extraerlas ahora es la diferencia entre una fuente de verdad y cuatro copias divergentes.

### Alcance

1. A `src/lib/finance/` las reglas de negocio, como funciones puras:
   - progreso de una meta (con billeteras vinculadas o sin ellas)
   - uso de un presupuesto
   - normalización de un recurrente a monto mensual (`daily → ×30`, `weekly → ×52/12`)
   - conversión a ARS
2. Los formateadores unificados en `format-currency.ts`. Los 9 locales se borran.
3. **Vitest** + tests de esas funciones puras. Casos que importan: meta sin billeteras, meta con billeteras en distinta moneda, meta con `target_amount` en 0 (división por cero), presupuesto excedido, recurrente semanal.
4. Actualizar `CLAUDE.md`: hoy dice "no hay test suite en este proyecto" y con este ticket deja de ser cierto.

### Decisiones a tomar durante la implementación

- **Solo funciones puras.** Nada de tests de componentes ni de API routes en este ticket. El objetivo es red donde es barata, no cobertura.

### Riesgos

- Es un refactor transversal: toca ~10 archivos sin cambiar comportamiento. Hacerlo **después** de `C2` no es casual — si algo se rompe, se ve.
- Verificar que unificar el formateo no cambie los decimales mostrados en ARS (hoy `minimumFractionDigits: 0`) ni en USD.

### Done cuando

- `npm test` corre verde.
- `grep -rn "Intl.NumberFormat" src/` devuelve **solo** `format-currency.ts`.
- Ninguna regla financiera queda escrita dos veces.

### Resultado (2026-08-27)

**Lo que se hizo**:

| Pieza | Qué |
|---|---|
| `lib/finance/rules.ts` | Las tres reglas que estaban duplicadas, como funciones puras: `savingGoalProgress`, `budgetUsage` y `monthlyRecurringAmount`. La conversión a ARS ya vivía en un solo lugar (`exchange-rates.ts`), no hizo falta moverla |
| `lib/utils/format-currency.ts` | `formatCurrency(monto, moneda, formato)` con cinco variantes nombradas — `auto`, `rounded`, `exact`, `byCurrency`, `compact`. Los nueve formateadores locales se borraron |
| `dashboard/page.tsx` | Tenía las tres reglas duplicadas más dos formateadores. Ahora no calcula ninguna |
| `saving-goal-card` · `budget-card` · `recurring-transaction-list` | Consumen las reglas en vez de repetirlas |
| `wallet-card` · `wallet-adjust-form` · `transaction-item` · `transaction-list` · `finanzas-dashboard` | Solo formateo |
| `vitest.config.mts` + `npm test` | Vitest, `environment: 'node'`, tests al lado del archivo que prueban |

**Verificación**:

| Qué | Resultado |
|---|---|
| `npm test` | **21 tests, 2 archivos, verde** |
| `grep -rn "Intl.NumberFormat" src/` | Solo `format-currency.ts` |
| `npx tsc --noEmit` / `npm run lint` / `npm run build` | Sin errores; 12 warnings, igual que el baseline |
| Decimales en pantalla | Sin cambios: los 7 tests de `format-currency.test.ts` fijan la salida exacta de cada variante contra lo que devolvía el `Intl.NumberFormat` que reemplazó |

**Tres decisiones que valen la pena anotar**:

1. **No se unificó la precisión, se le puso nombre.** Los nueve formateadores no coincidían y eso no era un bug: un saldo de billetera se muestra al centavo (`exact`) y una meta redondeada (`rounded`) a propósito. Forzar una sola precisión habría sido un cambio de producto disfrazado de refactor. Lo que se unificó es *dónde vive la regla*, no la regla.
2. **`byCurrency` era una regla real escondida.** El dashboard y `finanzas-dashboard` repetían `currency === 'ARS' ? 0 : 2` decimales. Es la regla "los pesos no llevan centavos, el dólar sí" y ahora tiene nombre.
3. **El umbral de riesgo del dashboard (75%) quedó en el dashboard.** Es una decisión de qué mostrar en esa pantalla, no una regla de negocio. El de alerta del presupuesto (80%) sí bajó a `rules.ts`, porque define el color de la card en cualquier lugar donde se muestre.

**Un cambio de comportamiento, chico y a favor**: el progreso de una meta ya no puede ser negativo. Si una billetera vinculada está en rojo, la card dibujaba una barra de ancho negativo; ahora corta en 0. El resto del refactor no cambia ni un píxel.

**Lo que no se hizo**: nada de tests de componentes ni de API routes, como decía el ticket. La red está donde es barata.

---

## `C4` — Motor de avisos + vencimientos por mail

Estado: **cerrado (2026-08-27)**

### Por qué

Lumus hoy **no le avisa nada a nadie, nunca**. `recurring_transactions` guarda `next_date` pero no hay `vercel.json`, no hay cron, y el pago se marca a mano entrando a la app. Si no entrás, el seguro de la moto vence y te enterás por el banco.

Para una app de finanzas, avisar es *la* función que justifica que exista en vez de una planilla. Todo lo demás es registro histórico.

Este ticket construye **la cañería que van a usar todos los avisos** (`C5` y `C8` incluidos) y la estrena con el que más falta hace: los vencimientos.

### Alcance

**El motor** (sirve para todo aviso futuro):

1. Tabla `notifications`: `user_id`, `type`, `title`, `body`, `link`, `dedupe_key`, `read_at`, `emailed_at`, `created_at`. RLS: cada usuario lee y marca como leídas **solo las suyas**, y nadie inserta desde el cliente — igual que `free_access_grants` (`00018`), solo `service_role` escribe.
2. **`unique(user_id, dedupe_key)`**: la garantía de que el mismo aviso no se manda dos veces. Sin esto, un cron que corre dos veces te manda el mismo mail dos veces, y eso es todo lo que hace falta para que alguien desactive los avisos para siempre.
3. Tabla `notification_preferences`: por usuario y por tipo, con defaults sensatos. Esta sí la escribe el usuario.
4. `src/lib/notifications/` — crear un aviso, resolver preferencias, y mandar el mail por Resend. Un solo camino, el mismo que ya usa `lib/feedback/notify-email.ts`.
5. **Digest diario**: un mail por usuario por día como máximo, con todo junto. Nunca un mail por evento.
6. **Link de baja en el pie de todo mail**, funcionando sin login (token firmado). No es cortesía, es lo mínimo para mandar mail no transaccional.

**El primer aviso**:

7. `vercel.json` con un cron diario que pegue a `/api/cron/avisos`.
8. Busca recurrentes activos con `next_date` a ≤3 días o ya vencidos, agrupados por usuario, y genera las notificaciones.
9. El mail se diseña **en claro, no en oscuro**. Gmail fuerza los mails oscuros a tema claro y los grises pensados para fondo negro quedan ilegibles: pasó exactamente eso con el mail de feedback en la ronda 1.

### Riesgos

- **El endpoint de cron es público por URL.** Protegerlo con `CRON_SECRET` verificado contra el header `Authorization`, o cualquiera lo dispara. Es el mismo tipo de agujero que `00017` cerró en las funciones `SECURITY DEFINER`.
- El cron corre con `service_role` (no hay sesión de usuario), así que **RLS no aplica**: filtrar por `user_id` explícitamente en cada query, no confiar en la política.
- **Horario.** El cron de Vercel se agenda en UTC. Un aviso que llega 3 de la mañana hora argentina es un aviso que se ignora — apuntar a la mañana en UTC-3.
- **Verificar contra la doc actual** el límite de crons del plan Hobby de Vercel y el límite diario de envíos del plan free de Resend, antes de diseñar la cadencia. No de memoria.
- Efecto colateral bueno: un cron diario que consulta la base **evita que el proyecto free de Supabase se pause por 7 días de inactividad**.

### Done cuando

- Con un vencimiento a 2 días, llega el mail en la corrida real del cron (no en una invocación manual desde local).
- Sin vencimientos próximos, **no llega ningún mail**. Un aviso diario que dice "nada que informar" se ignora en una semana.
- Correr el cron dos veces seguidas **no manda el aviso dos veces**.
- El endpoint devuelve 401 sin el secreto.
- El link de baja del pie funciona sin estar logueado.

### Resultado (2026-08-27)

**Los dos límites que había que verificar antes de diseñar la cadencia** (y que salieron distintos de lo que uno supondría):

- **Vercel Hobby: una corrida por día**, con la hora garantizada dentro de la franja, no el minuto. El límite de *cantidad* de crons se levantó a 100 en enero de 2026, pero la *frecuencia* sigue siendo diaria y una expresión que dispare más seguido **falla en el deploy**. El digest diario no fue una elección de diseño: es el único diseño posible en este plan.
- **Resend free: 3.000 mails al mes pero 100 por día.** El diario es el que aprieta primero. Con dos usuarios sobra, pero fija el techo: un mail por usuario por día escala hasta 100 usuarios sin cambiar de plan; uno por evento no.

**Lo que se hizo**:

| Pieza | Qué |
|---|---|
| `00022_notifications.sql` | `notifications` + `notification_preferences`, RLS como `00018` (el usuario lee lo suyo, nadie inserta desde el cliente) |
| `lib/notifications/notifications.ts` | El motor: crear con dedupe, resolver preferencias, sellar lo enviado |
| `lib/notifications/due-recurring.ts` | Qué vencimientos ameritan aviso hoy — función pura, con tests |
| `lib/notifications/due-notification.ts` | El texto que ve la persona, más `todayInArgentina()` |
| `lib/notifications/digest-email.ts` | El mail, en claro; y el envío por Resend |
| `lib/notifications/unsubscribe-token.ts` | HMAC-SHA256 para el link de baja |
| `/api/cron/avisos` | El cron, con `CRON_SECRET` |
| `/api/notifications/unsubscribe` + `/baja` | La baja, sin login |
| `vercel.json` | `0 11 * * *` — 8 de la mañana en Argentina |

**Verificación, toda contra producción**:

| Qué | Resultado |
|---|---|
| Endpoint sin secreto y con secreto equivocado | `401` en los dos casos |
| Corrida sin vencimientos próximos | `{"notices":0,"emailsSent":0}` — ningún mail |
| Corrida con un vencimiento a 2 días | `{"notices":1,"emailsSent":1}` |
| **Segunda corrida seguida, mismo vencimiento** | `{"notices":1,"emailsSent":0}` — la dedupe aguantó |
| Aviso generado | `"Vence en 2 días · $ 45.000"`, con `dedupe_key = venc:<id>:2026-08-29:proximo` |
| `/baja` sin sesión | Abre y muestra el botón; con token inválido dice que el link no sirve |
| `GET` al endpoint de baja | `405` — un escáner de links de un cliente de correo no puede dar de baja a nadie |
| One-click de Gmail (`POST` form-encoded con el token en la query) | Da de baja; sin token, `400` |
| `POST` con firma manipulada | Rechazado |
| Trigger de `notifications`, como `authenticated` | Marcar `read_at` funciona; reescribir el `title` y borrarse el `emailed_at` fallan |
| `npm test` / `tsc` / `lint` / `build` | 42 tests verdes, sin errores |

El recurrente de prueba, su aviso y la preferencia quedaron borrados: la base volvió a 0 filas en las tres tablas.

**Cuatro decisiones que valen la pena anotar**:

1. **Un vencimiento se avisa dos veces, no una ni cuatro.** Una vez cuando entra en la ventana de 3 días y otra cuando ya venció. Avisar solo tres días antes hace que el aviso llegue cuando todavía no podés pagarlo y que no llegue el día que sí; avisar los cuatro días (3, 2, 1, 0) es la forma más rápida de que alguien apague los avisos. La fase va dentro del `dedupe_key`, así que la idempotencia sigue valiendo por fase.
2. **El digest se arma sobre `emailed_at is null`, no sobre lo recién creado.** Un aviso cuyo mail falló ayer entra en el de hoy en vez de perderse. Y `emailed_at` se sella **después** de que Resend confirma: al revés, un fallo del mail dejaría el aviso marcado y la persona no se enteraría nunca.
3. **La baja es `POST`, no `GET`.** Los escáneres de links de los clientes de correo siguen los `GET`, y una baja disparada por un antivirus es una baja que el usuario nunca pidió. El link del mail lleva a una página con un botón.
4. **`/baja` es una ruta abierta, no una ruta pública.** Las públicas (`/login`, `/register`) rebotan al dashboard si ya tenés sesión — y con esa regla, un usuario logueado que hace clic en el link del pie terminaba en el dashboard sin poder darse de baja.

**Efecto colateral buscado**: el cron diario consulta la base todos los días, así que el proyecto free de Supabase deja de estar a tiro de pausarse por 7 días de inactividad.

**El primer mail real cayó en spam**, que para este ticket es lo mismo que no haber llegado. La autenticación del dominio no era el problema — DKIM (`resend._domainkey`), SPF (`send.gestorlumus.site`, `include:amazonses.com`) y DMARC (`p=none`) resuelven bien. Lo que faltaba eran los headers **`List-Unsubscribe` y `List-Unsubscribe-Post`**, que Gmail exige a los remitentes masivos desde 2024 y que son los que le ponen su propio botón de "Cancelar suscripción" arriba del mail. El link del pie conformaba a una persona pero no le decía nada al filtro. El endpoint ahora atiende a los dos: JSON desde `/baja`, y el POST form-encoded de un clic que manda el cliente de correo solo, con el token en la query.

Lo que **no** se puede arreglar desde el código: el dominio casi no tiene historial de envío, y el contenido de la prueba (asunto "PRUEBA C4 — borrar") se lee exactamente como spam. Marcar ese mail como "no es spam" en Gmail ayuda para esa casilla. Si más adelante los avisos siguen cayendo, el paso siguiente es endurecer DMARC de `p=none` a `p=quarantine`, que es un cambio de DNS y no de repo.

**Un bug en el guard del drop, encontrado al re-correr la migración**: la primera versión dropeaba cualquier `notifications` vacía, así que **volver a correr la migración borraba la tabla nueva**. No lo salvó el guard: lo salvó que el re-run falló más adelante (`notification_preferences already exists`) y Postgres revirtió el lote entero. Ahora el guard mira la columna `module`, que solo existe en la tabla de `00001`. La lección general: una migración con un `drop` tiene que identificar *qué* está dropeando, no solo que el nombre coincida.

**Un texto que mentía, corregido antes de cerrar**: la pantalla de baja decía "podés volver a activarlos desde tu perfil" y esa pantalla no existe. En vez de prometerla, el mismo link del mail ahora sirve para las dos cosas — el token firmado vale igual para prender que para apagar, y quien ya no entra a la app no tiene otra cosa que ese link.

**Lo que no se hizo**: no hay UI de preferencias dentro de la app. Va en `C5`, junto con el centro de notificaciones.

---

## `C5` — Centro de notificaciones in-app + resto de los avisos

Estado: **abierto**

### Por qué

`C4` deja el motor andando con un solo aviso. Este ticket lo aprovecha: enchufa el resto de los eventos que valen la pena y le da al usuario un lugar donde verlos **dentro de la app**, no solo en la bandeja de entrada.

El mail es para lo que necesita sacarte de la app (algo vence, algo se rompió). El centro in-app es para lo que querés ver cuando entrás, sin que te llene el mail.

### Alcance

**Centro de notificaciones**:

1. Campanita en el nav con badge de no leídas. Panel desplegable con las últimas, marcar una como leída y marcar todas.
2. Cada notificación linkea a donde importa (`link`): el vencimiento, el presupuesto, la meta.
3. Las de más de 90 días se borran solas en la corrida del cron. Un centro de notificaciones que acumula dos años de avisos no lo abre nadie.
4. Pantalla de **preferencias en `/perfil`**: por tipo de aviso, elegir in-app, mail, o nada.

**Los avisos que se enchufan** (todos pasan por el motor de `C4`):

| Aviso | Cuándo | Default |
|---|---|---|
| Presupuesto al 80% | Al cruzar el umbral, **una sola vez por mes y categoría** | in-app + mail |
| Presupuesto excedido | Al cruzar el 100%, una sola vez por mes y categoría | in-app + mail |
| Meta de ahorro alcanzada | Cuando el progreso llega al 100% | in-app + mail |
| Reporte mensual listo | Día 1, cuando hay datos del mes anterior | in-app + mail |
| Resumen semanal | Lunes: gastado en la semana vs. promedio de las 4 anteriores | **apagado por default** |
| Pago rechazado / suscripción por vencer | Ver `C8` — el aviso es lo que hace usable el período de gracia | mail (no se puede apagar) |

### Decisiones tomadas

- **Los avisos de facturación no se pueden apagar.** Son transaccionales: si no llegan, el usuario pierde el acceso sin enterarse de por qué.
- **El resumen semanal arranca apagado.** Es el más fácil de percibir como spam y el que menos urgencia tiene. Que lo prenda quien lo quiera.
- **Nada de avisos de "gasto inusual"** por ahora. Detectar un gasto atípico sin generar falsos positivos es un problema estadístico propio, y un aviso que se equivoca seguido entrena al usuario a ignorar todos los demás.

### Riesgos

- **El volumen es el enemigo.** Entre presupuestos, metas y vencimientos, un mes activo puede generar 15 avisos. El digest diario de `C4` es lo que lo hace tolerable — verificar que todos los tipos pasen por ahí y ninguno mande mail suelto.
- Los avisos de presupuesto dependen de calcular gasto por categoría en el mes: **usar las funciones de `C3`**, no reimplementar la regla en el cron. Es exactamente el bug de las metas esperando repetirse.
- El badge de no leídas no puede pegarle a la base en cada render. Contarlo en el server component del layout del dashboard.

### Done cuando

- Cruzar el 80% de un presupuesto genera **un** aviso, y volver a cargar un gasto en esa categoría **no genera otro**.
- Apagar un tipo de aviso en `/perfil` lo apaga de verdad, in-app y por mail.
- El badge muestra el número correcto y se limpia al leer.
- Un mes de uso normal no genera más de un mail por día.

---

## `C6` — PWA instalable + carga rápida de gasto

Estado: **abierto**

### Por qué

No hay `manifest.json` ni service worker: Lumus hoy es una pestaña del navegador. Pero los gastos se cargan **en el momento de gastar**, parado en la caja, no a la noche sentado en la compu. Cada paso entre "gasté" y "quedó registrado" es una transacción que no se carga nunca — y la app depende de carga 100% manual.

### Alcance

- `manifest.json` con los íconos ya existentes (`public/logoLumus.png`, `public/lumus-orb.png`), `display: standalone`, tema `#0a0a0f`.
- App shortcut "Cargar gasto" que abra directo el formulario, con la categoría y billetera más usadas preseleccionadas.
- Meta tags de iOS (Safari ignora buena parte del manifest y necesita las suyas).
- Revisar el formulario de transacción en pantalla chica: teclado numérico por default (`inputMode="decimal"`), y que el botón de guardar no quede tapado por el teclado.

### Decisiones a tomar

- **Sin service worker de offline en este ticket.** Cachear datos financieros y sincronizarlos después es un problema de conflictos, no de caché, y no se resuelve de paso. Este ticket es instalabilidad y fricción, nada más.

### Riesgos

- Un service worker mal configurado sirve una versión vieja de la app después de un deploy. Si no hay offline, tampoco hace falta service worker: el manifest solo ya da instalabilidad.

### Done cuando

- La app se instala desde Chrome en Android y desde Safari en iOS, y abre sin barra de navegador.
- Desde el ícono instalado, cargar un gasto toma **menos de 15 segundos** cronometrados.

---

## `C7` — Importador de CSV con mapeo manual

Estado: **abierto**

### Por qué

Hay 2.306 transacciones cargadas y ya hubo un import de MyFinance (1.583 quedaron con `deleted_at` de esa limpieza). La carga es 100% manual y va a seguir siéndolo — pero cargar el resumen del banco a mano, línea por línea, es la razón número uno por la que alguien abandona una app de finanzas en el mes 2.

**Esto no es clasificación automática por IA.** Vos subís el CSV, **vos** mapeás qué columna es qué, y **vos** asignás las categorías por lote. No hay ningún modelo decidiendo dónde va tu plata: el importador solo evita tipear.

### Alcance

- Subida de CSV con preview de las primeras filas.
- **Mapeo manual de columnas** (fecha, monto, descripción) con detección del formato de fecha y del separador decimal — el CSV de un banco argentino trae `1.234,56`, no `1234.56`.
- Asignación de categoría por lote: agrupar por descripción similar y asignar de a grupos, no de a filas.
- **Detección de duplicados** por fecha + monto + descripción contra lo que ya existe, marcados en el preview y desmarcados por default para importar.
- Import atómico: o entran todas o no entra ninguna. Y que el trigger de balance recalcule bien al final, no una vez por fila.
- Un resumen final: cuántas entraron, cuántas se saltearon por duplicadas.

### Riesgos

- **Es la acción con más potencial destructivo de toda la app.** Un import mal mapeado mete cientos de filas basura. Confirmación explícita antes de escribir, y que el resumen final incluya cómo deshacerlo (las transacciones tienen soft delete, así que un `deleted_at` masivo por lote de import es viable — considerar guardar un `import_batch_id`).
- Encoding: los CSV de bancos argentinos suelen venir en Latin-1, no UTF-8. Si no se detecta, todos los acentos entran rotos.
- El trigger de balance corriendo 500 veces en un import puede ser lentísimo. Insertar en bloque y recalcular una sola vez.

### Done cuando

- Un CSV real de banco entra completo, con montos y fechas correctos, y los balances de las billeteras quedan bien.
- Reimportar el mismo archivo **no duplica nada**.
- Un import se puede revertir sin tocar la base a mano.

---

## `C8` — Cerrar el paywall

Estado: **abierto** — parcialmente anotado en `docs/BILLING.md`

### Por qué

Es lo único que separa a Lumus de poder cobrar. `SUBSCRIPTION_PRICE_ARS = 1000` sigue siendo el precio de prueba (`src/lib/billing/plan.ts`) y el caso `paused` nunca se probó — solo se validó `authorized → cancelled`.

**No depende de ningún otro ticket. Depende de una decisión tuya**, que es el precio. Por eso está último en la lista y no en el orden de trabajo real: se puede adelantar el día que tengas el número.

### Alcance

1. Precio real en `plan.ts` y en el preapproval de Mercado Pago.
2. Probar `paused`: qué ve el usuario, si vuelve solo a `authorized` cuando se regulariza.
3. **Período de gracia.** Hoy el gate es binario: `authorized` o portazo (`src/lib/billing/access.ts`). Un rechazo transitorio de tarjeta —el caso más común de todos— te deja afuera de tu propia app sin aviso. Unos días de gracia con banner de aviso antes de cortar el acceso.
4. Qué pasa con los datos de alguien que se da de baja: hoy quedan ahí y el usuario no puede entrar a verlos. Decidir si se exporta, si se avisa antes, o si se deja explícito en algún lado.

### Riesgos

- **La base y el código tienen que deployarse juntos.** Este ticket toca el gate de acceso, que es exactamente el que dejó al dueño afuera de la app el 2026-08-20 por un desfasaje de minutos.
- El período de gracia necesita una columna nueva o una regla derivada de `updated_at` en `billing_subscriptions`. Si es columna, es migración.
- Probar sin romper el acceso de cortesía de `free_access_grants`: el gate mira las dos cosas.

### Done cuando

- Una suscripción en `paused` tiene un comportamiento **decidido, implementado y probado**, no descubierto en producción.
- El precio real está en el código y en Mercado Pago, y coinciden.
- Un usuario con un pago rechazado ve un aviso antes de perder el acceso.

---

## Decidido que NO se hace en esta ronda

| Qué | Por qué |
|---|---|
| Clasificación automática de gastos por IA | Decisión explícita y sostenida del usuario: la carga es manual a propósito. `C7` acelera la carga **sin** sacarle la decisión de encima |
| Notificaciones push | Entre el mail de `C4` y el centro in-app de `C5`, el aviso ya llega. Push suma permisos del navegador, service worker y un canal más que mantener, para decir lo mismo |
| Panel de admin | Ya se decidió en `B4`: runbooks de SQL en `docs/ADMIN.md`. Con 2 usuarios, un panel es una app entera para no escribir tres queries |
| Offline real | Ver `C6` (PWA). Cachear plata y sincronizar después es un problema de conflictos, no de caché |
| Tests de componentes o E2E | `C3` pone tests donde son baratos y evitan bugs reales. Playwright con un solo desarrollador es mantenimiento sin retorno todavía |

---

## Cómo se cierra un ticket

Mismo formato que la ronda 1 — ver "Formato para cerrar una tarea" más abajo. En resumen: se marca el estado, se anota el commit y la fecha, **qué se verificó y cómo**, y las decisiones que se tomaron sobre la marcha.

Los tres chequeos de siempre antes de dar algo por terminado: `npx tsc --noEmit`, `npm run lint`, `npm run build`.

---

# Ronda 1 — cerrada (2026-08-20)

Backlog acordado con el usuario en la sesión del 2026-08-20. Siete tareas, todas cerradas, commiteadas y deployadas a producción (`www.gestorlumus.site`).

Los pendientes de `docs/BILLING.md` no se duplicaban acá — ahora viven en el ticket `C7` de la ronda 2.

---

## Orden de trabajo

| # | Tarea | Por qué está en esa posición |
|---|---|---|
| `B1` | Backups cifrados semanales | Hoy no existe **ningún** backup y las tareas B3 y B6 tocan la base. Va primero, sí o sí |
| `B2` | Hardening previo al segundo usuario | Rápido, y tiene que estar antes de que entre alguien más |
| ~~`B3`~~ | ~~Acceso gratis (`free_access_grants`)~~ | **Cerrado 2026-08-20** |
| `B4` | Snippets de admin en docs | Va pegado a B3: es la forma de otorgar el acceso |
| ~~`B5`~~ | ~~Botón de feedback in-app~~ | **Cerrado 2026-08-20** |
| ~~`B6`~~ | ~~Unificar categorías~~ | **Cerrado 2026-08-20** |
| `B7` | Íconos ampliados + picker rediseñado | Cosmética con impacto alto, pero nada depende de ella |

---

## `B1` — Backups cifrados semanales

Estado: **cerrado** — 2026-08-20. Ver `docs/BACKUP.md`

### Por qué

El plan de Supabase de la organización es **free**, y el plan free **no tiene backups de ningún tipo** (los diarios con 7 días de retención arrancan en Pro; PITR es un add-on aparte). Verificado contra la API el 2026-08-20.

Hoy las 2.306 transacciones, las billeteras y los usuarios existen en **un solo lugar del mundo**. Un `UPDATE` sin `WHERE` o un mal día de Supabase y no hay de dónde volver.

### Alcance

- Script `scripts/backup.mjs` + entrada `backup` en los scripts de `package.json`
- Usa el CLI de Supabase (v2.107.0, proyecto ya linkeado a `ccixixskklovvvikiwbq`)
- Dumpea **schema y datos de `public` y de `auth`**
- Cifra el resultado con `openssl` (ya instalado, sin dependencias nuevas)
- Destino: `/mnt/c/Users/rasef/Lumus-Backups/lumus-YYYY-MM-DD.sql.enc`
- Verifica que el archivo no quede vacío e imprime tamaño y conteo de filas por tabla
- No borra backups viejos (a ~14 MB por semana, un año son ~700 MB)
- Documentar el procedimiento de restauración en `docs/`

### Decisiones tomadas

- **Cadencia manual**, corriendo `npm run backup` una vez por semana. Sin automatización por ahora
- **La subida a Google Drive es manual**: el script deja el archivo en una carpeta de Windows, el usuario la abre en el Explorador y lo sube a Drive. Se descartaron `rclone` y la carpeta espejo de Drive Desktop
- **Se cifra antes de subir.** El dump contiene el historial financiero completo y `auth.users` (mails y hashes de contraseña, del usuario y del tester). La passphrase va al gestor de contraseñas, nunca a un archivo
- Destino en `/mnt/c/...` y no en `~`, para que sea una carpeta normal de Windows y no haya que ir a buscarla a `\\wsl$\Ubuntu\home\...`

### Riesgos a resolver durante la implementación

- El script necesita la **password de la base** (no el `service_role`). Va en `.env` local — `.gitignore` ya cubre `.env*`
- En plan free, la conexión directa a `db.ccixixskklovvvikiwbq.supabase.co` es **solo IPv6** (IPv4 es add-on pago). Hay IPv6 en la WSL2 pero puede no rutear a internet. Si falla: ir por el pooler, o exportar tabla por tabla a JSON vía HTTPS con `service_role`
- Si se pierde la passphrase, se pierden los backups. Por eso va al gestor de contraseñas

### Done cuando

- `npm run backup` genera el `.sql.enc` cifrado en la carpeta de Windows
- **El dump se restauró con éxito al menos una vez** en un Supabase local (`supabase start`). Un backup que nunca se probó restaurar no es un backup, es un archivo
- El procedimiento de restauración está escrito en `docs/`

---

## `B2` — Hardening previo al segundo usuario

Estado: **cerrado** — 2026-08-20 (`00017_harden_security_definer_functions.sql`).

### Por qué

Con un solo usuario estos tres puntos eran teóricos. Con una segunda persona real usando la app, son higiene mínima.

### Alcance

1. **Funciones `SECURITY DEFINER` expuestas sin login.** El linter de seguridad de Supabase marca que `seed_default_finance_categories(p_user_id)` y `recompute_wallet_balance(p_wallet_id)` las puede ejecutar el rol `anon` por REST — cualquiera, sin estar logueado, pasando el uuid que quiera. Revocar `EXECUTE` a `anon` y validar `auth.uid()` adentro. Nueva migración
2. **Protección de contraseñas filtradas desactivada** (Supabase chequea contra HaveIBeenPwned). Es un toggle en el dashboard
3. **`daily-greeting.tsx:82` manda el email personal del dueño** en el header `User-Agent` de una API externa. Con otro usuario en la app, ese mail se sigue mandando en cada request que hace él. Reemplazar por un valor genérico o una variable de entorno

### Riesgos

- Los cambios de config de auth hechos por Management API o CLI **no toman efecto hasta reiniciar el proyecto**. Si se toca el toggle desde el dashboard web esto no aplica, pero conviene verificar que quedó activo

### Done cuando

- El linter de seguridad de Supabase ya no reporta las dos funciones para el rol `anon` — **hecho**
- La protección de contraseñas filtradas figura activa — **no se puede en el plan free**, ver abajo
- No queda ningún dato personal hardcodeado en el código — **hecho**

### Resultado (2026-08-20)

Migración `00017_harden_security_definer_functions.sql`, aplicada y verificada en producción:

| Verificación | Resultado |
|---|---|
| ACL de las dos funciones | `PUBLIC` y `anon` fuera; quedan `authenticated` y `service_role` |
| `anon` llamando a cualquiera de las dos | `permission denied` |
| El dueño recalculando su billetera | Funciona |
| Otro usuario tocando esa billetera | `No autorizado: esa billetera no es tuya` |
| Otro usuario sembrando categorías ajenas | `No autorizado: solo podes sembrar categorias para tu propio usuario` |
| Trigger de balance tras insertar una transacción | Recalcula bien (probado y revertido con `rollback`) |
| `npx tsc --noEmit` / `npm run lint` | Sin errores; 14 warnings, igual que el baseline |

Criterio de la validación: se compara contra `auth.uid()` **solo cuando hay un JWT detrás**. Si `auth.uid()` es null (`service_role` o mantenimiento como `postgres`), no se bloquea — ese acceso ya es privilegiado por definición y bloquearlo rompería los scripts de mantenimiento.

El linter sigue reportando las dos funciones como ejecutables por `authenticated`, y **eso es correcto y buscado**: las API routes y el trigger de balance las necesitan. Ahora están protegidas por la validación interna de dueño.

### Protección de contraseñas filtradas: bloqueada por el plan

**No se puede activar en el plan free.** La Management API responde textual:

> Configuring leaked password protection via HaveIBeenPwned.org is available on Pro Plans and up.

El linter de seguridad la sigue reportando igual, pero el arreglo está detrás del plan Pro. **Reevaluar el día que se pase a Pro** (mismo día en que, según lo hablado, se le empezaría a cobrar al tester).

Mitigación gratis que sí se aplicó: `password_min_length` del servidor pasó de **6 a 8**. La app ya exigía 8 en registro, reset y cambio de contraseña (`src/lib/validations/profile.ts:19`, `register/page.tsx:88`, `reset-password/page.tsx:123`), pero el servidor aceptaba 6 — o sea que alguien llamando a la API de Auth directamente, salteando el formulario, podía poner una más corta. Ahora coinciden.

No se tocó `password_required_characters` (exigir letras + números): la UI no valida eso, así que el servidor rechazaría contraseñas que el formulario da por buenas. Si se quiere, hay que actualizar primero los schemas de Zod.

### Decidido no hacer

`auth_insufficient_mfa_options` — el linter pide más métodos de MFA. Con dos usuarios y una app de finanzas personales sin datos de terceros, agregar MFA es fricción sin beneficio real hoy. Se revisa si la app se abre a más gente.

---

## `B3` — Acceso gratis para el tester (`free_access_grants`)

Estado: **cerrado** — 2026-08-20 (`00018_free_access_grants.sql`). Ver `docs/ADMIN.md`

### Por qué

El paywall exige `billing_subscriptions.status = 'authorized'`, o sea que hoy el tester tendría que **pagar $1.000 ARS/mes de verdad**. No se le va a cobrar: entra a probar la app, reportar bugs y proponer mejoras.

### La trampa que hay que evitar

Lo intuitivo sería un campo `acceso_gratis` en `user_profiles`. **No se puede**: la policy de esa tabla es `users can manage own data`, así que el propio usuario puede hacer `UPDATE` sobre su fila y **auto-otorgarse el acceso desde la consola del navegador**. Sería regalar el paywall.

### Alcance

Tabla nueva, con RLS de **solo lectura** para el dueño y **cero policies de escritura** — solo `service_role` puede otorgar:

```
free_access_grants
  user_id      uuid pk → auth.users
  reason       text        -- 'beta tester', 'amigo', etc.
  expires_at   timestamptz -- null = para siempre
  granted_at   timestamptz
```

- Nueva migración
- El gate pasa de `status = 'authorized'` a `status = 'authorized' OR grant vigente`, en **los dos lugares** donde vive hoy: `src/lib/supabase/middleware.ts:69` y `src/app/(dashboard)/layout.tsx:27`
- En `/perfil`, mostrarle **"Acceso de cortesía"** en vez de una tarjeta de suscripción de Mercado Pago vacía o falsa

### Decisiones tomadas

- Se descartó la alternativa rápida (insertar a mano una fila `billing_subscriptions` con `status='authorized'` y monto 0): deja datos falsos de facturación y se rompe raro si el webhook de MP toca esa fila. Servía para un tester de una semana, no para "vamos a pulir la app juntos durante meses"
- `expires_at` existe para el día que se pase a Supabase Pro y se quiera empezar a cobrar: se le pone fecha o se borra el grant, y cae solo en `/suscripcion` sin tocar una línea de código

### Done cuando

- El tester entra al dashboard sin pagar y sin fila en `billing_subscriptions` — **hecho**
- Un usuario sin grant y sin suscripción sigue siendo redirigido a `/suscripcion` — **hecho**
- Un usuario cualquiera **no puede** insertarse ni modificarse un grant — **hecho, probado**
- `/perfil` le muestra "Acceso de cortesía" — **hecho**

### Resultado (2026-08-20)

Migración `00018_free_access_grants.sql`, aplicada y verificada contra producción:

| Prueba | Resultado |
|---|---|
| Usuario logueado intentando auto-otorgarse un grant | `new row violates row-level security policy` |
| `service_role` otorgando | Funciona |
| Usuario leyendo **su** grant (lo necesita `/perfil`) | Funciona |
| Usuario intentando ver el grant de otro | 0 filas |

La regla de acceso quedó centralizada en **`src/lib/billing/access.ts`** (`getAccessStatus` / `hasAccess`) y se consulta desde tres lugares: el proxy, el layout del dashboard y `/suscripcion`. Vive en un solo archivo a propósito: estaba duplicada en dos gates y si las copias se desincronizan, el paywall queda abierto por un lado y cerrado por el otro.

### Un riesgo que apareció implementando

`src/app/suscripcion/page.tsx` solo redirigía si había suscripción paga. Un usuario con acceso de cortesía podía llegar a esa pantalla y **pagar $1.000 que no necesitaba**. Ahora esa página también usa `hasAccess`.

### Limpieza de cuentas (2026-08-20)

Al revisar el estado real aparecieron tres cuentas: la principal con una fila de facturación **falsa** (`authorized` sin id de Mercado Pago), y dos de prueba bloqueadas en `pending` y `cancelled`.

Resuelto con el usuario, en una sola transacción y con backup previo (`lumus-2026-08-20-pre-B2-B3.sql.enc`):

- `renzoasef02@gmail.com` (la cuenta real, 2.306 transacciones) pasó de la fila falsa de `billing_subscriptions` a un `free_access_grants` con `reason = 'dueño del proyecto'` y sin vencimiento. El grant se creó **antes** de borrar la fila vieja, para que el acceso no quedara en el aire en ningún momento.
- Se borraron las dos cuentas de prueba. Verificado antes de borrar: 0 billeteras, 0 transacciones, 0 categorías, 0 presupuestos, 0 metas y 0 reportes cada una. Y verificado contra la API de Mercado Pago que ninguna de sus suscripciones estaba cobrando: una figura `cancelled`, la otra ni siquiera es un preapproval válido (checkout que nunca se completó).
- `billing_subscriptions` quedó en **0 filas**: ya no hay ni un dato falso de facturación en la base.

Integridad después de la limpieza: 2.306 transacciones, 15 billeteras, balance total $2.862.950,00 — idéntico a antes.

---

## `B4` — Snippets de admin en docs (en vez de un panel)

Estado: **cerrado** — 2026-08-20. Ver `docs/ADMIN.md`

### Por qué

Hoy **no existe ningún concepto de admin en Lumus**: no hay rol, ni flag, ni columna. El usuario dueño es un usuario común que además posee el proyecto de Supabase.

Se evaluó construir un panel `/admin` y **se decidió que no**. Con 2 usuarios, el dashboard de Supabase ya es el panel de admin, y es mejor que cualquiera que se construya: otorgar el acceso gratis, listar usuarios, leer el feedback, todo es un `INSERT` o un `SELECT` de 30 segundos. Un panel propio sería trabajo que no mejora la app para ningún usuario y que suma superficie de riesgo: cualquier bug en una pantalla que lee datos de *todos* los usuarios es una filtración cruzada. El dashboard de Supabase tiene cero de ese riesgo.

### Alcance

Documentar en `docs/` los snippets de SQL que se van a usar de verdad, listos para pegar en el SQL editor de Supabase:

- Otorgar acceso gratis a un usuario por email
- Revocar un acceso gratis
- Listar usuarios con su estado de suscripción y de grant
- Leer el feedback pendiente (depende de `B5`)

### Si algún día se hace el panel

La decisión de seguridad ya está tomada: **no** poner `is_admin` en `user_profiles` (misma trampa que `B3` — el usuario se haría admin a sí mismo). Para un solo admin, variable de entorno `ADMIN_USER_ID` chequeada del lado del servidor: cero cambios de schema, imposible de auto-otorgarse. Si algún día son varios, se migra a `app_metadata`, que solo escribe `service_role`.

### Done cuando

- Los snippets están en `docs/ADMIN.md` y **todos se probaron contra producción** — hecho

### Resultado (2026-08-20)

`docs/ADMIN.md` cubre seis cosas, todas con el SQL probado:

1. **Otorgar / revocar acceso de cortesía**, con y sin vencimiento
2. **Ver quién entra y por qué** — replica la regla de `src/lib/billing/access.ts`
3. **Soporte: ¿se registró bien?** — en cuál de los tres pasos quedó trabado (verificación de mail, onboarding, paywall)
4. **Soporte: qué tiene cargado un usuario** — filtrando `deleted_at is null`, para que los números coincidan con lo que el usuario ve
5. **Salud del free tier** — tamaño contra el límite de 500 MB, más los límites que no se ven en SQL
6. **Borrar una cuenta** — el procedimiento de tres pasos previos (ver qué se pierde, verificar que no haya una suscripción cobrando en Mercado Pago, backup), porque el borrado cascadea y es irreversible

Falta un solo snippet, el de leer el feedback, que necesita la tabla de `B5`. Queda marcado como pendiente dentro del propio documento.

---

## `B5` — Botón de feedback in-app

Estado: **cerrado** — 2026-08-20 (`00019_feedback.sql`)

### Por qué

La idea del segundo usuario es que pruebe la app y reporte bugs y mejoras, para pulirla entre los dos. Sin un canal dentro de la app, todo eso llega por WhatsApp y se pierde.

### Alcance

- Tabla nueva para el feedback (con RLS: el usuario inserta y lee lo suyo)
- Botón accesible desde la app con un formulario corto (tipo: bug / mejora / otro, y descripción)
- Guardar contexto útil automáticamente: ruta desde la que se reportó, fecha, user agent
- Validación con Zod, como todo el resto de los formularios
- La lectura del feedback se hace desde el dashboard de Supabase (ver `B4`), no hay pantalla de admin

### Done cuando

- El tester puede reportar desde la app y el registro aparece en la tabla — hecho
- El snippet para leerlo está documentado en `B4` — hecho, en `docs/ADMIN.md`

### Resultado (2026-08-20)

| Pieza | Dónde |
|---|---|
| Tabla + RLS | `00019_feedback.sql` |
| Validación | `src/lib/validations/feedback.ts` |
| API | `POST /api/feedback` |
| UI | `src/components/shared/feedback-button.tsx`, montado en el layout del dashboard |
| Lectura | `docs/ADMIN.md` |

Pruebas de RLS y constraints contra producción, todas revertidas con `rollback`:

| Prueba | Resultado |
|---|---|
| Usuario creando su propio feedback | Funciona |
| Usuario creándolo a nombre de otro | Rechazado por RLS |
| Usuario marcando su reporte como resuelto | 0 filas afectadas |
| Mensaje vacío o solo espacios | Rechazado por el CHECK |
| `kind` fuera de la lista | Rechazado por el CHECK |

### Dos decisiones de diseño

- **`user_id` es nullable con `on delete set null`, no `cascade`.** Si más adelante se borra la cuenta de un tester, sus reportes sobreviven. Perderlos junto con la cuenta sería tirar justo lo que la tabla vino a juntar.
- **Se guarda la ruta desde la que se reportó.** Sin eso, "no me anda el botón" es imposible de ubicar. El user agent se toma del header en el servidor, no del body, para no sumar otro campo de texto libre que validar.

---

## `B6` — Unificar categorías

Estado: **cerrado** — 2026-08-20 (`00020_merge_finance_categories.sql`)

### Por qué

Con el tiempo se acumulan categorías que significan lo mismo — "Salario" y "Sueldo", por ejemplo, donde antes se anotaba en una y ahora en la otra. Hoy no hay forma de juntarlas: quedan separadas para siempre en reportes y presupuestos.

### La UI es simple, la plomería no

Desde la vista del usuario: entrás a "Salario", tocás **"Unificar con…"**, elegís "Sueldo", confirmás, y todo lo que estaba en Salario queda en Sueldo — mismos montos, mismas fechas, nada se pierde.

Por debajo hay que reasignar **tres tablas**, porque el soft delete actual **oculta** la categoría pero no unifica nada (las transacciones siguen apuntando a la categoría vieja):

| Tabla | FK | Qué pasa hoy si se borra la categoría |
|---|---|---|
| `transactions` | `on delete set null` | La transacción queda sin nombre ni color |
| `recurring_transactions` | `on delete set null` | Ídem |
| `budgets` | `on delete cascade` | El presupuesto **se borra** |

### Alcance

- Función SQL (RPC) que hace la unificación de forma **atómica**, en una migración nueva. Va sí o sí por RPC: son 3-4 `UPDATE` que tienen que pasar todos o ninguno, y el cliente de Supabase no maneja transacciones multi-statement. Mismo patrón que `seed_default_finance_categories`
- Endpoint que la llame, con verificación de auth
- Diálogo de confirmación en la lista de categorías que diga **cuántas transacciones, vencimientos y presupuestos se van a mover**

### Decisiones tomadas

- **Una categoría por vez**, no varias a la vez
- **Presupuestos con conflicto: se suman.** `budgets` tiene `unique(user_id, category_id, month, year)`. Si había $50.000 en "Comida" y $20.000 en "Delivery" para agosto, la unificada queda en $70.000, que es lo que refleja lo que realmente se gastaba entre las dos
- **Se permite unificar categorías `is_default` como origen**, cosa que el `DELETE` actual bloquea (`categories/[id]/route.ts:56`). Es una acción explícita y con confirmación, distinta de un borrado accidental
- **No se puede mezclar `gasto` con `ingreso`**
- **No se guarda log de la unificación.** Es irreversible y el diálogo lo tiene que dejar claro

### Efecto colateral aceptado

Los reportes de IA ya generados (`finance_reports`) quedan desactualizados, porque mencionan categorías que ya no existen. Se regeneran, no es grave.

### Done cuando

- Unificar mueve transacciones, vencimientos y presupuestos, y suma los presupuestos en conflicto — hecho
- El origen queda con `deleted_at` y desaparece de las listas — hecho
- Los totales no cambian antes y después de unificar — hecho
- Si la RPC falla a mitad de camino, no queda nada a medio mover — hecho, es una sola función

### Resultado (2026-08-20)

| Pieza | Dónde |
|---|---|
| Función SQL atómica | `00020_merge_finance_categories.sql` |
| API | `POST /api/finance/categories/[id]/merge` (+ `GET` para la vista previa) |
| Hook | `mergeCategory` en `use-finance-categories` |
| UI | `merge-category-dialog.tsx`, botón en cada categoría de la lista |

Escenario completo probado contra producción y revertido con `rollback`:

| Verificación | Resultado |
|---|---|
| Transacciones activas movidas | Sí |
| Transacciones **borradas** movidas | Sí — 4 movidas de las cuales 2 visibles |
| Presupuestos que chocan en el mismo mes | Sumados: $1.000 + $500 = **$1.500** |
| Presupuestos sin conflicto | Movidos tal cual |
| Origen tras la unificación | `deleted_at` seteado, fuera de las listas |
| Mezclar gasto con ingreso | Rechazado |
| Unificar consigo misma | Rechazado |
| Categoría inexistente o ajena | Rechazado |
| Sin login / rol `anon` | Rechazado — `anon` ni siquiera puede ejecutar la función |

### Tres decisiones

- **`SECURITY INVOKER`, no `DEFINER`.** Corre con los permisos del usuario, así que RLS sigue aplicando en las cuatro tablas. No tenía sentido sumar otra función privilegiada justo después de limpiar las dos de `00017`.
- **Las transacciones borradas también se reasignan.** Si más adelante se restaura una, tiene que apuntar a una categoría que siga existiendo. Pero el número que se le informa al usuario es solo el de las **visibles**: de las 2.306 transacciones de la cuenta, 1.583 están borradas, así que informar el total mostraría un número que no se corresponde con nada de lo que ve en pantalla. La función devuelve los dos.
- **El botón de unificar aparece también en las categorías default**, que no se pueden borrar pero sí pueden ser **origen** de una unificación. Es una acción explícita y con confirmación, distinta de un borrado accidental.

---

## `B7` — Íconos ampliados + picker rediseñado

Estado: **cerrado** — 2026-08-20

### Por qué

Hay **24 íconos** en un mapa manual (`src/lib/utils/category-icons.tsx:8`) y el picker es una grilla plana de 6 columnas sin buscador (`category-form.tsx:123`). Con 24 entra justo; con 100 sería inusable así.

### Decisión: se queda lucide

Se evaluaron Phosphor, Iconoir y Solar, y se decidió **seguir con lucide**:

- `shadcn/ui` trae lucide adentro, así que cambiar dejaría **dos** librerías de íconos en el bundle
- Toda la app usa lucide (nav, botones, dashboard). Cambiar solo las categorías queda incoherente; cambiar todo es una migración grande sin ganancia funcional
- El problema no es lucide, son 24 opciones y un cuadradito gris. Lo que hace que un ícono se vea bien es el **contenedor**: círculo con el color de la categoría de fondo y el ícono en ese color. Eso ya se hace en `transaction-list.tsx:601` pero **no** en el picker de `category-form.tsx:127`, que usa borde blanco al 10% sobre fondo blanco al 5%. Por eso se ve genérico

Si más adelante vuelve la espina de Phosphor: los íconos se guardan como **slugs de texto** en la base, así que se pueden remapear con un script sin tocar el resto de la app.

### Alcance

- Ampliar `CATEGORY_ICON_MAP` de 24 a ~100-120 íconos de lucide, curados a mano y agrupados por tema (Comida, Transporte, Casa, Salud, Ocio, Trabajo, Finanzas…)
- Buscador en el picker, filtrando por nombre **y por sinónimos en español** — que escribir "auto" encuentre `car`
- Rediseño visual del picker con el tratamiento de círculo de color
- **Extender el picker a billeteras y metas de ahorro.** `wallets` y `saving_goals` ya tienen columna `icon` en la base pero ningún formulario deja elegirla: hoy siempre queda en `null` (`wallet-form.tsx:47`, `saving-goal-form.tsx:30`). Como el componente se rehace igual, es trabajo marginal
- Sin migración de base: se siguen guardando slugs

### Done cuando

- El picker con ~100 íconos es cómodo y el buscador encuentra por palabra en español — hecho, **141 íconos en 12 grupos**
- Los íconos ya guardados siguen funcionando — hecho, verificado slug por slug
- Billeteras y metas pueden elegir ícono y se ve en listados — hecho
- El bundle no crece de forma desproporcionada — hecho, build compila igual

### Resultado (2026-08-20)

De 24 íconos a **141**, agrupados en 12 categorías temáticas (Comida, Transporte, Hogar, Salud, Compras, Ocio, Trabajo y estudio, Finanzas, Servicios y tecnología, Personas y mascotas, Viajes, Otros).

Cada ícono lleva **sinónimos en español**, así que el buscador funciona con las palabras que uno realmente usa. Probado:

| Se escribe | Encuentra |
|---|---|
| `auto` | `car`, `car-front` |
| `nafta` | `fuel` |
| `alquiler` | `home`, `key` |
| `expensas` | `trash-2`, `building-2` |
| `netflix` | `tv` |
| `psicólogo` | `brain` (con acento) |
| `birra` | `beer` |
| `tarjeta` | `credit-card` |

Los 141 nombres se verificaron **contra la versión instalada de lucide (1.16.0) antes de escribir el archivo**, y se comprobó que los 24 slugs originales siguen presentes: se guardan como texto en la base, así que sacar uno rompería las categorías que ya lo tenían.

El picker nuevo (`icon-picker.tsx`) es compartido por los tres formularios y muestra cada ícono **ya teñido con el color de la entidad**, sobre su propio fondo — exactamente como se va a ver después en las listas. Ese era el punto: el problema nunca fue lucide, era la grilla plana de cuadraditos grises.

### Dos bugs latentes que aparecieron al hacerlo

Las columnas `icon` de `wallets` y `saving_goals` existían pero no había forma de elegirlas. Al conectarlas apareció que tampoco estaban bien mostradas:

1. **`saving-goal-card.tsx` renderizaba el ícono como texto plano.** Si se hubiera guardado uno, la tarjeta habría mostrado literalmente `piggy-bank`. Ahora usa `CategoryIcon`, con la inicial del nombre como fallback.
2. **El ícono de la billetera no se mostraba en ningún lado.** La tarjeta usa un ícono fijo según el tipo de billetera. Ahora el ícono elegido a mano **pisa** al del tipo, y si no hay ninguno se mantiene el comportamiento anterior.

---

## Decidido que NO se hace

| Qué | Por qué |
|---|---|
| Panel `/admin` | El dashboard de Supabase alcanza para 2 usuarios y no suma superficie de riesgo. Ver `B4` |
| Cambiar de librería de íconos | `shadcn/ui` ya trae lucide; habría dos librerías en el bundle. Ver `B7` |
| `rclone` o carpeta espejo de Drive | El usuario prefiere bajar el backup y subirlo a Drive a mano. Ver `B1` |
| Log reversible de unificaciones | Trabajo extra para un caso que se cubre con un diálogo de confirmación claro. Ver `B6` |
| Automatizar los backups | Manual por ahora, por decisión explícita. Ver `B1` |

---

## Formato para cerrar una tarea

```md
Estado: cerrado
Commit/fecha: YYYY-MM-DD
Verificacion:
- comando o flujo manual probado
Notas:
- decisiones tomadas
```

---

## Trabajo extra de la misma sesión (2026-08-20)

Fuera de las siete tareas, apareció esto:

| Qué | Por qué |
|---|---|
| **Aviso por mail de cada feedback** | `B5` guardaba los reportes pero nadie se enteraba: quedaban esperando a que alguien se acordara de mirar, que es el mismo silencio que la tarea vino a romper. `lib/feedback/notify-email.ts`, vía Resend |
| **Rediseño de las pantallas de auth** | El login decía "Sistema operativo personal", el alcance previo a junio, y era lo primero que veía cualquiera. El logo estaba recortado en una caja de 44px. El bloque de marca estaba copiado en las cinco páginas |
| **Cuenta del beta tester** | Creada a mano con el mail ya confirmado, más su acceso de cortesía. Runbook en `docs/ADMIN.md` |
| **Limpieza de cuentas** | Ver `B3` |

### Dos cosas que solo se vieron mirando el resultado real

1. **El mail de feedback salía ilegible.** Estaba diseñado oscuro, siguiendo la identidad del producto. Gmail fuerza los mails oscuros a tema claro, y los grises elegidos contra un fondo negro quedaron lavados sobre blanco — el bloque con el `update` para marcarlo resuelto era prácticamente invisible. Se detectó por una captura del usuario, no por ninguna verificación automática. Ahora se diseña en claro.
2. **`RESEND_API_KEY` no estaba en Vercel.** Los mails de auth salen por el SMTP de Supabase, así que la app nunca había necesitado esa key. La feature habría funcionado en local y **no habría enviado nada en producción**, en silencio.

Las dos comparten la misma moraleja que la prueba de restauración de `B1`: **compila, se ve bien y no funciona** son tres cosas distintas.

---

## Estado al cierre de la sesión

Las siete tareas cerradas, commiteadas y deployadas. Producción sincronizada con `main`.

Lo que queda pendiente **no es código** — está en `docs/ESTADO_ACTUAL.md`, sección "Acciones pendientes fuera del repo".
