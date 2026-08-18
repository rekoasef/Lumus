# Billing — Paywall con Mercado Pago Suscripciones

Estado: **implementado, deployado y probado con plata real en producción** (pago, cobro y cancelación real, con sincronización automática por webhook).

## Qué se busca

Lumus se registra libre (email + código de verificación, ver flujo de auth ya implementado), pero solo puede usar el dashboard quien tenga una suscripción paga activa. El gate se resuelve igual que el de `onboarding_done`: si no está pago, se redirige a `/suscripcion` en vez de al dashboard.

## Decisiones tomadas

- **Procesador**: Mercado Pago Suscripciones (API `/preapproval`), cobro en ARS.
- **Ambiente**: se usa Mercado Pago de **producción** directamente (no sandbox) — el entorno de test de MP no anda bien. Se prueba el flujo real con plata real.
- **Precio de prueba**: **$1000 ARS/mes** en `src/lib/billing/plan.ts` (`SUBSCRIPTION_PRICE_ARS`). Arrancó en $10 pero Mercado Pago rechaza preapprovals por debajo de ~$15 ARS, así que se subió a $1000 solo para poder probar el flujo de punta a punta — **sigue siendo precio de prueba, no el real de lanzamiento**. Subir a precio real antes de lanzar (un solo lugar).
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

## Pendiente antes de un lanzamiento de verdad

- [ ] Subir `SUBSCRIPTION_PRICE_ARS` (`src/lib/billing/plan.ts`) del precio de prueba ($1000 ARS) al precio real
- [ ] Probar el caso de suscripción `paused` (no probado, solo `authorized → cancelled`)
