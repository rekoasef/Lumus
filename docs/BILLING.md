# Billing — Paywall con Mercado Pago Suscripciones

Estado: **planeado, todavía no implementado**. Este doc es la referencia para cuando se arranque a codear.

## Qué se busca

Lumus se registra libre (email + código de verificación, ver flujo de auth ya implementado), pero solo puede usar el dashboard quien tenga una suscripción paga activa. El gate se resuelve igual que el de `onboarding_done`: si no está pago, se redirige a `/suscripcion` en vez de al dashboard.

## Decisiones tomadas

- **Procesador**: Mercado Pago Suscripciones (API `/preapproval`), cobro en ARS.
- **Ambiente**: se usa Mercado Pago de **producción** directamente (no sandbox) — el entorno de test de MP no anda bien. Se prueba el flujo real con plata real.
- **Precio de prueba**: **$10 ARS/mes** como placeholder mientras se prueba el flujo de punta a punta. Subir a precio real antes de lanzar (un solo lugar: `src/lib/billing/plan.ts`).
- **Cuenta propia (Rekoasef)**: no se bloquea con código. Se marca a mano por SQL en `billing_subscriptions` con `status='authorized'` después de correr la migración. Sin modo admin en el código.
- **Tabla nueva**: `billing_subscriptions` — no reusar la tabla `subscriptions`/`recurring_transactions` existente, que es un concepto de finanzas personales (vencimientos tipo Netflix) completamente distinto.

## Pasos manuales en Mercado Pago (antes de codear)

1. Entrar a [mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers) → **Tus integraciones** → crear una aplicación (o usar la existente).
2. Copiar el **Access Token de producción** (`APP_USR-...`) → va en `MERCADOPAGO_ACCESS_TOKEN` (server-only, nunca en el cliente).
3. En la app → **Webhooks** → configurar la URL de notificación: `https://gestorlumus.site/api/billing/webhook` (necesita el dominio ya conectado y el deploy en producción, HTTPS obligatorio — Mercado Pago no manda webhooks a `localhost`).
4. Revelar el **secret** generado para firmar los webhooks → va en `MERCADOPAGO_WEBHOOK_SECRET`.
5. Elegir el evento `subscription_preapproval` (y opcionalmente `payment`, aunque hoy el plan no lo procesa).

## Diseño técnico (resumen — ver el detalle completo en el plan de la sesión)

- **Migración** `billing_subscriptions`: `user_id` (único), `mp_preapproval_id`, `status` (`pending`/`authorized`/`paused`/`cancelled`), `amount`, `currency`, `next_payment_date`. RLS: el usuario puede leer y crear su propia fila (`pending`); solo el webhook (con `service_role`) puede cambiar el estado.
- **`POST /api/billing/create-subscription`** (autenticado): crea el `preapproval` en MP, guarda la fila `pending`, devuelve `init_point` para redirigir al checkout hosteado de MP.
- **`POST /api/billing/webhook`** (pública): valida `x-signature` (HMAC-SHA256 sobre `id:{data.id};request-id:{x-request-id};ts:{ts};` con `MERCADOPAGO_WEBHOOK_SECRET` — **validar el formato exacto con el simulador de webhooks de MP antes de confiar en esto**, la documentación pública no es 100% consistente entre países/versiones), consulta el estado real en la API de MP y actualiza `billing_subscriptions`.
- **Gate**: en `src/app/(dashboard)/layout.tsx` y `src/lib/supabase/middleware.ts`, mismo patrón que el chequeo de `onboarding_done` ya existente.
- **Página `/suscripcion`**: muestra el estado y un botón que dispara el checkout.

## Checklist para el día de la implementación

- [ ] Migración aplicada (`billing_subscriptions` + RLS)
- [ ] `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` cargados en `.env.local` y en Vercel
- [ ] Dominio `gestorlumus.site` ya resuelto en producción (el webhook necesita HTTPS público)
- [ ] Webhook configurado en Mercado Pago apuntando a `https://gestorlumus.site/api/billing/webhook`
- [ ] Cuenta propia marcada como `authorized` a mano por SQL
- [ ] Prueba real: cuenta nueva → registro → verify → onboarding → cae en `/suscripcion` → pagar $10 ARS real → webhook llega y pasa a `authorized` → entra al dashboard
- [ ] Revisar en Mercado Pago Developers → Webhooks que la entrega haya sido 200
- [ ] Antes de lanzar de verdad: subir `SUBSCRIPTION_PRICE_ARS` al precio real
