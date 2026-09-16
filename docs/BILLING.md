# Billing — Paywall con Mercado Pago Suscripciones

Estado: **implementado, deployado y probado con plata real en producción** (pago, cobro y cancelación real, con sincronización automática por webhook).

## Qué se busca

Lumus se registra libre (email + código de verificación, ver flujo de auth ya implementado), pero solo puede usar el dashboard quien tenga una suscripción paga activa. El gate se resuelve igual que el de `onboarding_done`: si no está pago, se redirige a `/suscripcion` en vez de al dashboard.

## Decisiones tomadas

- **Procesador**: Mercado Pago Suscripciones (API `/preapproval`), cobro en ARS.
- **Ambiente**: se usa Mercado Pago de **producción** directamente (no sandbox) — el entorno de test de MP no anda bien. Se prueba el flujo real con plata real.
- **Precio**: **$7.800 ARS/mes** (`SUBSCRIPTION_PRICE_ARS`, desde el 2026-09-17), el equivalente a 5 USD con ajuste cada 6 meses (`docs/NEGOCIO.md`). Antes fue $1000 de prueba: Mercado Pago rechaza preapprovals por debajo de ~$15 ARS. Cambiarlo solo afecta a las suscripciones nuevas.
- **Cuenta cobradora de Mercado Pago** (dueña del `MERCADOPAGO_ACCESS_TOKEN`): `radevelopment02@gmail.com`. Si se rota el Access Token a otra cuenta/app, hay que reconfigurar el webhook en la app nueva (ver gotchas abajo).
- **Cuenta propia (Rekoasef, `renzoasef02@gmail.com`)**: no se bloquea con código. Se marcó a mano por SQL en `billing_subscriptions` con `status='authorized'`, sin pasar por Mercado Pago. Sin modo admin en el código.
- **Tabla nueva**: `billing_subscriptions` — no reusar la tabla `subscriptions`/`recurring_transactions` existente, que es un concepto de finanzas personales (vencimientos tipo Netflix) completamente distinto.
- **Dominio**: `gestorlumus.site` conectado a Vercel (proyecto `lumus`, org `renzos-projects`) vía registro A, no delegación completa de nameservers — el aviso "Nameservers ✘" en `vercel domains inspect` es esperado, no un error.

## Pasos manuales en Mercado Pago (antes de codear)

1. Entrar a [mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers) → **Tus integraciones** → crear una aplicación (o usar la existente).
2. Copiar el **Access Token de producción** (`APP_USR-...`) → va en `MERCADOPAGO_ACCESS_TOKEN` (server-only, nunca en el cliente).
3. En la app → **Webhooks** → configurar la URL de notificación: `https://www.gestorlumus.site/api/billing/webhook` — **con `www`, no el apex** (ver gotchas abajo). Necesita el dominio ya conectado y el deploy en producción, HTTPS obligatorio — Mercado Pago no manda webhooks a `localhost`.
4. Revelar el **secret** generado para firmar los webhooks → va en `MERCADOPAGO_WEBHOOK_SECRET`.
5. Elegir el evento `subscription_preapproval` (y opcionalmente `payment`, aunque hoy el plan no lo procesa).

## Diseño técnico (resumen — ver el detalle completo en el plan de la sesión)

- **Migración** `billing_subscriptions`: `user_id` (único), `mp_preapproval_id`, `status` (`pending`/`authorized`/`paused`/`cancelled`), `amount`, `currency`, `next_payment_date`. RLS: el usuario puede leer y crear su propia fila (`pending`); solo el webhook (con `service_role`) puede cambiar el estado.
- **`POST /api/billing/create-subscription`** (autenticado): crea el `preapproval` en MP, guarda la fila `pending`, devuelve `init_point` para redirigir al checkout hosteado de MP.
- **`POST /api/billing/webhook`** (pública): valida `x-signature` (HMAC-SHA256 sobre `id:{data.id};request-id:{x-request-id};ts:{ts};` con `MERCADOPAGO_WEBHOOK_SECRET` — **validar el formato exacto con el simulador de webhooks de MP antes de confiar en esto**, la documentación pública no es 100% consistente entre países/versiones), consulta el estado real en la API de MP y actualiza `billing_subscriptions`.
- **Gate**: en `src/app/(dashboard)/layout.tsx` y `src/lib/supabase/middleware.ts`, mismo patrón que el chequeo de `onboarding_done` ya existente.
- **Página `/suscripcion`**: muestra el estado y un botón que dispara el checkout.

## Gotchas de la integración (para no perder tiempo redescubriéndolos)

- **Mercado Pago Developers tiene config de Webhooks separada por modo Prueba/Producción.** Hay que cargar la URL específicamente en la pestaña **Producción** — si no, `vercel logs` nunca muestra ninguna llamada entrante aunque todo esté bien configurado del lado de la app.
- **La URL del webhook tiene que llevar `www`**: `https://www.gestorlumus.site/api/billing/webhook`. El apex `gestorlumus.site` redirige (308) a `www.` y Mercado Pago no sigue redirects, así que con la URL sin `www` el webhook fallaba con 502 / nunca llegaba.
- **No podés pagarte a vos mismo.** Si el navegador tiene sesión de Mercado Pago logueada con la misma cuenta que cobra (dueña del Access Token), el botón de pagar queda gris en el checkout. Probar en ventana de incógnito o con una cuenta de MP distinta a la cobradora.
- **Débito no funciona para Suscripciones/Preapproval** — es una restricción de la plataforma de Mercado Pago, no hay parámetro de API para habilitarlo. Solo tarjeta de crédito.
- **`vercel env add` vía `echo "valor" | vercel env add ...` guarda un `\n` al final del valor**, lo que puede romper URLs (`back_url`) y firmas. Usar `printf 'valor' | vercel env add ...` en vez de `echo` para cargar env vars sin salto de línea.
- **El upsert de `billing_subscriptions` en `create-subscription` usa el client de `service_role`**, no el del usuario — las policies de RLS solo dejan reintentar mientras el estado siga `pending`, así que sin `service_role` reintentar suscribirse después de un `cancelled` tira "new row violates row-level security policy".
- **Sin probar todavía**: qué pasa con una suscripción en estado `paused` (se probó `authorized → cancelled`, no `paused`).
- Nota aparte, no específica de Mercado Pago: cambios a la config de Auth de Supabase (SMTP, templates) vía Management API/CLI quedan guardados pero el servicio de Auth corriendo no los recarga solo — hace falta reiniciar el proyecto (`POST /v1/projects/{ref}/restart`) para que tomen efecto.

## Checklist de la implementación (completado 2026-08-14)

- [x] Migración aplicada (`billing_subscriptions` + RLS)
- [x] `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` cargados en Vercel
- [x] Dominio `gestorlumus.site` resuelto en producción (el webhook necesita HTTPS público)
- [x] Webhook configurado en Mercado Pago (pestaña Producción) apuntando a `https://www.gestorlumus.site/api/billing/webhook`
- [x] Cuenta propia marcada como `authorized` a mano por SQL
- [x] Prueba real: cuenta nueva → registro → verify → onboarding → cae en `/suscripcion` → pagar $1000 ARS real → webhook llega y pasa a `authorized` → entra al dashboard
- [x] Revisado en Mercado Pago Developers → Webhooks que la entrega haya sido 200
- [x] Probada cancelación real → webhook sincronizó solo a `cancelled`

## Prueba gratis y cobro apagado (2026-09-16)

- **Registrarse da 30 días gratis, sin tarjeta.** Lo hace el trigger de `auth.users` (`00034_trial_on_signup.sql`): con invitación manda la invitación (`beta_invites`), y sin invitación inserta un `free_access_grants` con `reason = 'prueba gratis'`. `TRIAL_DAYS` en `plan.ts` es solo para los textos.
- **Avisos de fin de acceso**: tipo `acceso_por_vencer`, no se puede apagar. Ver `lib/notifications/access-ending.ts`.
- **`CHECKOUT_ENABLED = false`** en `plan.ts`: sin botón de pago en `/suscripcion`, y `create-subscription` responde 403. **Se prende el día que se active el cobro**, junto con el monotributo, Vercel Pro y el precio real (`docs/LANZAMIENTO.md`).
- Con el cobro prendido, quien se suscribe durante la prueba **paga desde ese día**: los días gratis que le quedaban no se suman, y la pantalla lo dice. Pasarle a Mercado Pago una fecha de inicio (`auto_recurring.start_date`) evitaría eso, pero no está probado.

## El cobro, listo para prender (2026-09-17)

Todo lo de esta sección se hizo con el cobro apagado. **Se prendió el 2026-09-17** (`CHECKOUT_ENABLED = true`), por decisión del dueño: con la prueba de 30 días y `start_date`, el primer cobro real cae recién cuando termina la prueba del primer suscriptor, y esa es la fecha límite para el monotributo y Vercel Pro.

### El acceso dura lo que se pagó (`00035`)

- **`paid_until`** en `billing_subscriptions`: hasta cuándo está pago. Lo escribe **solo el webhook**, con el `next_payment_date` de MP mientras la suscripción está `authorized`, y **no se borra al cancelar** (`lib/billing/webhook-sync.ts`, testeado).
- **La regla** (`resolveAccessKind`, `lib/billing/access.ts`): `authorized` entra; `cancelled`/`paused`/`pending` con `paid_until` vigente entran como `paid_period`, más **`PAYMENT_GRACE_DAYS` = 3** de gracia para que un rechazo transitorio no sea un portazo. La usan el proxy, el layout, `/suscripcion` y el panel de admin (que lee `subscription_paid_until` de `admin_user_stats`).
- **Antes**: cancelar sacaba al usuario en el acto aunque tuviera 23 días pagos. Ahora sigue entrando, con un cartel en el dashboard y el estado en `/perfil` (*"No se renueva · hasta el X"*).
- **El usuario ya no puede escribir su fila.** 00011 dejaba insertar y editar mientras estuviera `pending`; con `paid_until` en la tabla, eso era regalarse meses desde la consola. Se borraron las dos policies: la tabla queda de solo lectura para el usuario, como `free_access_grants`.

### Suscribirse antes no hace perder días (`start_date`)

`create-subscription` le manda a MP `auto_recurring.start_date` con lo que termine último entre la prueba gratis y el período pago (`firstChargeDate`). Suscribirse el día 10 de la prueba cobra el día 30; volver a suscribirse después de cancelar cobra cuando se acaba lo pagado. `/suscripcion` muestra esa fecha. Ejemplo: registro el 25/10 → primer cobro el 24/11 → después cada 24.

### Webhook

- **Idempotente y tolerante al desorden por diseño**: no aplica el contenido del aviso, consulta el estado actual a MP y escribe eso. El mismo aviso dos veces escribe lo mismo.
- **Ignora avisos de otros tipos** (`type` distinto de `subscription_preapproval`) con 200: si alguien prende "pagos" en el panel de MP, antes daba 404 → 502 → reintentos infinitos.

### Pruebas con tarjeta real (pendientes, las hace el dueño)

Con el cobro prendido en un deploy de prueba o un rato en producción, con una cuenta de MP distinta a la cobradora:

1. **`start_date`**: suscribirse con una cuenta que tenga prueba vigente. Ver en MP que el primer cobro figure en la fecha de fin de la prueba y que **no** haya un cobro hoy (MP podría hacer una validación chica de la tarjeta, que se devuelve: anotarlo si pasa).
2. **Cancelar**: ver que la cuenta siga entrando, con el cartel, y que `paid_until` no se borre.
3. **Cambio de precio**: con una suscripción activa a un monto bajo, `PUT /preapproval/{id}` con `auto_recurring.transaction_amount` nuevo. ¿MP pide autorización al usuario o cobra el monto nuevo sin más? Define cómo se hace el ajuste de cada 6 meses (`docs/LANZAMIENTO.md`, sección 4).
4. **`paused`**: nunca se probó. Ver qué dispara MP y que la gracia funcione.

**Límite conocido**: si alguien se suscribe durante la prueba y cancela antes del primer cobro, el webhook ya guardó `paid_until` = fin de la prueba, y le quedan los 3 días de gracia de regalo. No vale la pena complicarlo.

## Pendiente antes de un lanzamiento de verdad

- [x] Subir `SUBSCRIPTION_PRICE_ARS` al precio real (7.800, 2026-09-17)
- [ ] Las pruebas con tarjeta real de la sección de arriba
- [x] Prender `CHECKOUT_ENABLED` (2026-09-17)
- [ ] Monotributo, Vercel Pro y `H6` antes del primer cobro real (fin de la prueba del primer suscriptor)
- [ ] Probar el caso de suscripción `paused` (no probado, solo `authorized → cancelled`)
