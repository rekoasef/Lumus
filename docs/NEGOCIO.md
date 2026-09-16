# Lumus — Precio y costos

Última revisión: 2026-09-16

Este doc junta la charla del 2026-09-16 sobre **cuánto cobrar** y **cuánto cuesta mantener Lumus** con 300 y con 1.000 usuarios. Los precios de terceros son los que se encontraron ese día. Antes de apoyarse en ellos, volver a mirarlos: cambian.

> **Estado (2026-09-16, misma charla):** el dueño decidió **5 USD por mes cobrados en pesos (~7.800 ARS)**, con un ajuste manual cada cierto tiempo para mantener ese valor. **Siguen abiertos** la frecuencia del ajuste, el precio de fundador, la prueba con o sin tarjeta y el plan anual. Están en la sección 2 de `docs/LANZAMIENTO.md`, junto con lo legal y el plan de marketing. El precio de `C8` (2026-08-27) queda reemplazado. No tocar `SUBSCRIPTION_PRICE_ARS` hasta cerrar lo abierto.

Cotización usada en todo el doc: **dólar blue venta 1.560 ARS** (bluelytics, 2026-09-16).

---

## 1. El precio

### Lo que había y por qué se revisa

El 2026-08-27 se decidió: **30 fundadores a 9.500 ARS congelado para siempre, público a 15.000 ARS**, y mes gratis solo en el plan mensual.

El 2026-09-16 aparecieron dos cosas:

1. **El dueño no quiere cobrar caro.** Su número inicial fue 5.000 ARS.
2. **Una suscripción en pesos se devalúa rápido**, y eso deja al descubierto un problema del plan anterior: *"9.500 congelado para siempre"* en pesos, con inflación, en dos años vale mucho menos. El congelamiento protegía al cliente de una suba, pero dejaba el ingreso a merced de la inflación.

### ¿Cobrar en dólares?

La idea del dueño: poner la suscripción en USD, total Mercado Pago le debita pesos al cliente.

- **No está confirmado que Mercado Pago lo acepte.** La referencia de `POST /preapproval` solo muestra ejemplos con `currency_id: "ARS"` y no dice qué monedas admite en Argentina. Hoy el código usa `SUBSCRIPTION_CURRENCY = 'ARS'` (`src/lib/billing/plan.ts`). **Se averigua probándolo**, no se afirma de memoria.
- **Aunque se pudiera, le complica la vida al cliente.** Un cobro en dólares con tarjeta argentina suele tener recargos impositivos para el que paga, y un precio en USD asusta.

### Lo que se propuso (no decidido)

**Cobrar en pesos, pero con el precio atado al dólar.**

| | Referencia | Hoy en pesos |
|---|---|---|
| **Público** | **5 USD/mes** | ~7.800 ARS |
| **Fundadores (primeros 30)** | **35% de descuento para siempre** | ~5.000 ARS |
| **Prueba** | Primer mes gratis, solo en el plan mensual | — |

- Cada tanto se actualiza el monto en pesos para que siga valiendo ~5 USD.
- **Los fundadores tienen un porcentaje fijo de descuento, no un monto fijo.** Así el descuento no se pierde con la inflación y el ingreso tampoco. Mantiene la urgencia de *"quedan N lugares"*.
- El número de fundadores coincide con los 5.000 que el dueño tenía en mente, pero solo para los primeros.
- Con 30 fundadores y 70 públicos: **~700 mil ARS/mes** en bruto.

### La incógnita que bloquea este esquema

Actualizar el monto de una suscripción activa. La doc de Mercado Pago dice que se hace con `PUT /preapproval/{id}` mandando `auto_recurring.transaction_amount`, pero **no dice si el usuario tiene que volver a autorizar** ni si hay un tope contra el monto autorizado al principio.

Con cohortes congeladas esto no bloqueaba nada. **Con un precio atado al dólar, sí.** Hay que probarlo **antes de lanzar**: suscribirse con una tarjeta real a un monto bajo, hacer el `PUT` y ver si Mercado Pago cobra el monto nuevo sin pedir nada.

Recordatorio: cambiar `SUBSCRIPTION_PRICE_ARS` **solo afecta a las suscripciones nuevas**. El monto de las que ya existen vive en Mercado Pago.

### Cuánto queda según el precio

Descontando la comisión de Mercado Pago (peor caso, 7,6%) y la IA (peor caso, ~155 ARS por usuario). **No incluye el monotributo** ni los costos fijos (sección 2).

| Precio mensual | En USD | Queda por usuario | Neto con 100 usuarios | Neto con 300 usuarios |
|---|---|---|---|---|
| 5.000 | 3,2 | ~4.460 | ~446 mil | ~1,34 millones |
| 7.800 | 5,0 | ~7.050 | ~705 mil | ~2,1 millones |
| 9.500 | 6,1 | ~8.620 | ~862 mil | ~2,6 millones |
| 15.000 | 9,6 | ~13.700 | ~1,37 millones | ~4,1 millones |

**Con cualquiera de estos precios los costos fijos se cubren con pocos usuarios**: con todo en Pro (~65 USD, ~101 mil ARS), hacen falta ~23 usuarios a 5.000 y ~8 a 15.000. El precio no define si se pierde plata, define cuánto se gana con la misma cantidad de gente. Con un tope de usuarios puesto por el tiempo del dueño (`C8`), eso importa.

### Comisión de Mercado Pago

No se encontró la tarifa específica de suscripciones. Las tarifas generales de cobro online en Argentina (2026) van de **~3% + IVA** (acreditación al día siguiente, menos si se acepta un plazo largo) a **6,29% + IVA** (acreditación inmediata con crédito). Para las cuentas se tomó el peor caso: **6,29% + IVA ≈ 7,6%**. Verificar en la cuenta de Mercado Pago qué plazo de acreditación conviene.

---

## 2. Qué cuesta mantener Lumus

### Servicio por servicio

| Servicio | Plan actual | Qué hace falta para cobrar | Costo |
|---|---|---|---|
| **Vercel** | **Hobby** (gratis) | **Pro — obligatorio** | 20 USD/mes por asiento, con 20 USD de consumo incluidos |
| **Supabase** | Free | Pro — recomendado | 25 USD/mes, con 10 USD de cómputo incluidos (instancia Micro: 2 núcleos, 1 GB), 8 GB de base y 100.000 usuarios activos al mes |
| **Resend** | Free (3.000/mes, 100/día) | Pro, desde ~80-100 usuarios | 20 USD/mes, 50.000 mails y sin tope diario |
| **Claude API** | Pago por uso | — | Ver abajo |
| **Mercado Pago** | — | — | Comisión por cobro (sección 1) |
| **Sentry** | Free | — | 0 |
| **Monotributo** | — | Consultar con un contador | Cuota fija |

**Vercel no admite espera.** El plan Hobby es solo para uso personal y no comercial, y cobrar una suscripción es uso comercial. **Hay que pasar a Pro antes del primer cobro.**

**Por qué Supabase Pro, aunque no sea obligatorio.** Ya estaba anotado en `docs/ESTADO_ACTUAL.md`:

- Backups automáticos diarios con 7 días de retención. El plan free no tiene ninguno, y hoy la única red es `npm run backup` (`B1`).
- Protección contra contraseñas filtradas (HaveIBeenPwned), bloqueada en el plan free.
- El proyecto free se pausa tras 7 días sin actividad.

Con gente pagando, que se pierda la base o que se pause no es un riesgo aceptable.

### La IA, con datos reales

Los dos usos de Claude (`claude-sonnet-5`: **2 USD por millón de tokens de entrada, 10 USD por millón de salida**):

- `ai-report`: `max_tokens: 1500`
- `wealth-analysis`: `max_tokens: 1200`

Cada uno se puede rehacer **una vez por mes** (`MAX_REPORT_REGENERATIONS = 1`). **Un usuario puede generar como máximo 4 informes por mes.**

Lo medido en la base el 2026-09-16: 6 informes guardados, de **~2.160 caracteres en promedio (~700 tokens de salida)**. La entrada se estimó generosa, en ~5.000 tokens por informe (prompt de sistema más los datos del mes).

| | Por informe | Por usuario/mes |
|---|---|---|
| **Peor caso** (salida al tope, 4 informes) | ~0,025 USD | **~0,10 USD** |
| **Caso realista** (~700 de salida, 2 informes sin rehacer) | ~0,017 USD | **~0,035 USD** |

**La IA casi no pesa por usuario**, pero con 1.000 usuarios es el costo más grande (sección 3). Los topes de regeneración son los que lo mantienen acotado. **No sacarlos.**

### Los mails, con datos reales

El digest diario (`/api/cron/avisos`) manda **como máximo un mail por usuario por día**, más los de autenticación (código de verificación, recuperar contraseña).

| Usuarios | Mails/mes (máximo) | Plan |
|---|---|---|
| ~80-100 | ~3.000 | Se pasa el tope del free (100/día) |
| 300 | ~9.000 | Pro (20 USD) |
| 1.000 | ~30.000 | Pro (20 USD), sigue sobrando |

### La base, con datos reales

El 2026-09-16: **15 MB** con 3 usuarios y 2.430 movimientos, casi todo peso fijo de Postgres. Con 1.000 usuarios sigue muy por debajo de 1 GB. **El tamaño no es un factor en ninguna de las dos opciones.**

---

## 3. Vercel + Supabase contra una VPS

El dueño planteó migrar todo a una VPS (Postgres propio más un servicio de autenticación tipo Keycloak) para ahorrarse Vercel Pro y Supabase Pro. Se comparó con DigitalOcean.

**Precios de DigitalOcean (2026-09-16):** droplets Basic de 12 USD (2 GB, 1 vCPU), 24 USD (4 GB, 2 vCPU) y 48 USD (8 GB, 4 vCPU). Backup semanal +20%, diario +30%.

**Supuestos de la VPS:** Next.js, Postgres y autenticación en el mismo droplet. Keycloak es Java y pide memoria, así que con Keycloak hace falta el de 4 GB. Además, una copia externa de la base (~5 USD), porque un backup que vive en el mismo proveedor no cubre que se pierda la cuenta.

### Con 300 usuarios (USD/mes)

| | Vercel + Supabase | VPS DigitalOcean |
|---|---|---|
| Hosting | Vercel Pro: 20 | Droplet 4 GB: 24 |
| Base + autenticación | Supabase Pro: 25 | Dentro del droplet |
| Backups | Incluidos | Diario 7 + copia externa 5 |
| Resend | 20 | 20 |
| Claude | 10 – 30 | 10 – 30 |
| **Total** | **75 – 95** | **66 – 86** |
| **En pesos** | **117 – 148 mil** | **103 – 134 mil** |

Sin Keycloak (con el login dentro de la misma app) alcanza el droplet de 2 GB y la VPS queda en **51 – 71 USD**.

### Con 1.000 usuarios (USD/mes)

| | Vercel + Supabase | VPS DigitalOcean |
|---|---|---|
| Hosting | 20 – 30 | Droplet 4 GB (24) u 8 GB (48) |
| Base | 25 – 30 (si hace falta pasar de Micro a Small) | Dentro del droplet |
| Backups | Incluidos | 12 – 20 |
| Resend | 20 | 20 |
| Claude | 35 – 100 | 35 – 100 |
| **Total** | **100 – 180** | **91 – 188** |

### Conclusión: quedarse con Vercel + Supabase

Es lo que el dueño ya intuía antes de ver los números (*"por 20 dólares no vale la pena armar todo de cero"*), y los números lo confirman:

1. **La VPS ahorra entre 15 y 30 USD por mes.** Con 300 usuarios eso es ~1–2% de lo que entra, y toda la infraestructura junta es ~6%. Con 1.000 la diferencia desaparece, porque lo que más pesa pasa a ser Claude, y cuesta lo mismo en las dos opciones.
2. **Migrar no es mover el hosting, es reescribir la app.**
   - Todas las consultas pasan por el cliente de Supabase (PostgREST).
   - Las políticas de RLS dependen de `auth.uid()`.
   - El registro con código, la recuperación de contraseña, las invitaciones (`grant_access_from_invite` sobre `auth.users`) y los backups (`B1`) están armados sobre Supabase.
   
   Son semanas de trabajo en el mes que el dueño se dio para lanzar (ronda 7).
3. **Con una VPS la operación pasa a ser del dueño:** parches de seguridad, restaurar si se rompe el disco, monitorear que no se caiga. Con gente pagando, el que atiende es él, y el tope de usuarios existe justamente para cuidar su tiempo.

**Cuándo volver a mirarlo:** con muchos más usuarios que 1.000, o si alguna factura se dispara. Aun así, lo primero para recortar es la IA (por ejemplo, un informe más barato), no el hosting.

---

## 4. Antes del primer cobro

- [ ] **Vercel a Pro**, porque Hobby prohíbe el uso comercial.
- [ ] Supabase a Pro, por los backups, las contraseñas filtradas y la pausa por inactividad.
- [ ] Cerrar el precio (sección 1) y ponerlo en `SUBSCRIPTION_PRICE_ARS`, que hoy está en **1.000** de prueba.
- [ ] Probar el `PUT /preapproval/{id}` con una tarjeta real, si el precio queda atado al dólar.
- [ ] Averiguar si Mercado Pago acepta `currency_id: "USD"` en suscripciones (solo si se sigue considerando).
- [ ] Monotributo: categoría y si Lumus entra como servicio. Consultar con un contador.
- [ ] Resend a Pro cuando el digest se acerque a los 100 mails/día (~80 usuarios).

## 5. La landing

Decidido que **hay que hacerla**. Hoy `gestorlumus.site` lleva directo al login (`src/app/page.tsx`). Está anotada como `H5` en `docs/BACKLOG.md`.

**Abierto:** el dueño pensó en ponerla en un subdominio. Lo más común es al revés: la landing en `gestorlumus.site` (es el link que la gente comparte) y la app en `app.gestorlumus.site`. Se decide al armarla.

**El mensaje ya está definido** desde el 2026-08-27: el diferencial no es *"controlá tus gastos"*, que ofrecen todas las apps, sino que **Lumus sabe que tus pesos se devalúan** (`D1`–`D4`).

---

## Fuentes (consultadas el 2026-09-16)

- [Vercel — Hobby Plan](https://vercel.com/docs/plans/hobby)
- [Vercel Pricing 2026 — Schematic](https://schematichq.com/blog/vercel-pricing)
- [Supabase Pricing 2026 — MakerKit](https://makerkit.dev/blog/saas/supabase-pricing)
- [Supabase Pricing 2026 — UI Bakery](https://uibakery.io/blog/supabase-pricing)
- [Resend — Pricing](https://resend.com/pricing)
- [Resend — What is Resend Pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing)
- [DigitalOcean — Droplet Pricing](https://www.digitalocean.com/pricing/droplets)
- [Comisiones de Mercado Pago en Argentina 2026](https://www.jonatanalmeira.com/comisiones-de-mercado-pago-en-argentina-cuanto-cobra-realmente/)
- [Comisiones Mercado Pago 2026 por país](https://www.guiadebancos.com/ar/blog/comisiones-mercado-pago-latam-2026)
- [Mercado Pago — Crear suscripción (API)](https://www.mercadopago.com.ar/developers/es/reference/subscriptions/_preapproval/post)
- [Cómo pagar suscripciones en dólares — Criteria](https://criteria.com.ar/general/como-pagar-las-suscripciones-pesos-dolares/)
- Precios de Claude: tabla de modelos de la skill `claude-api` (`claude-sonnet-5`: 2 / 10 USD por millón de tokens)
- Cotización: `api.bluelytics.com.ar/v2/latest`
