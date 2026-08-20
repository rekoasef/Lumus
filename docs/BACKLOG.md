# Lumus — Backlog de trabajo

Fecha: 2026-08-20

> `B1`, `B2` y `B3` están cerrados y **deployados a producción** (`vercel --prod`, 2026-08-20, `www.gestorlumus.site`). El deploy es manual: la base y el código deployado tienen que moverse juntos. Durante esta sesión quedaron desfasados unos minutos —se borró la fila de facturación falsa mientras producción todavía corría el código viejo— y eso dejó al dueño fuera de su propia app hasta el deploy. Si una tarea cambia el gate de acceso, deployar en el mismo tramo.

Backlog acordado con el usuario en la sesión del 2026-08-20. Siete tareas, ordenadas por dependencia y riesgo, no por ganas. Se toma una, se cierra, se verifica, y recién ahí se pasa a la siguiente.

Los pendientes de `docs/BILLING.md` (subir el precio de prueba de $1.000 ARS al precio final, probar el caso de suscripción `paused`) no se duplican acá.

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

Estado: pendiente

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

- El picker con ~100 íconos es cómodo de usar y el buscador encuentra por palabra en español
- Los íconos ya guardados siguen funcionando
- Billeteras y metas pueden elegir ícono, y se ve en dashboard y listados
- El bundle no crece de forma desproporcionada (lucide hace tree-shaking por import)

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
