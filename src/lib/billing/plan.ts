// Único lugar a tocar para subir el precio antes de lanzar de verdad.
export const SUBSCRIPTION_PRICE_ARS = 1000
export const SUBSCRIPTION_CURRENCY = 'ARS'
export const SUBSCRIPTION_REASON = 'Lumus — suscripción mensual'
export const SUBSCRIPTION_FREQUENCY_MONTHS = 1

/**
 * Días de prueba gratis al registrarse. El que manda es el trigger de
 * `00034_trial_on_signup.sql`: esto solo se usa para los textos. Si cambia uno,
 * cambiar el otro.
 */
export const TRIAL_DAYS = 30

/**
 * Desde cuántos días antes del fin del acceso gratis el cartel del dashboard se
 * vuelve más visible y ofrece suscribirse.
 */
export const ACCESS_ENDING_WARNING_DAYS = 7

/**
 * Si se puede pagar una suscripción. **Apagado hasta que se active el cobro**
 * (decisión del 2026-09-16, `docs/LANZAMIENTO.md`).
 *
 * Primero se consiguen ~10 usuarios con un mes gratis, y recién después, el
 * mismo día, se hace todo junto: monotributo, Vercel Pro (Hobby prohíbe el uso
 * comercial), precio real en `SUBSCRIPTION_PRICE_ARS` y lo legal de `H6`.
 * Prender esto antes es cobrar en negro y desde un plan que no lo permite.
 *
 * Apagado, `/suscripcion` no muestra el botón de pago y la API rechaza el
 * checkout: la pantalla y la API tienen que decir lo mismo.
 */
export const CHECKOUT_ENABLED = false

/**
 * El precio decidido el 2026-09-16: el equivalente a 5 USD, cobrado en pesos, y
 * revisado cada 6 meses (`docs/NEGOCIO.md`). Es el que anuncia la landing
 * mientras el cobro está apagado. El día que se active el cobro,
 * `SUBSCRIPTION_PRICE_ARS` pasa a valer esto.
 */
export const LIST_PRICE_ARS = 7800

/**
 * El precio que se le muestra a alguien que todavía no paga. Con el cobro
 * prendido manda el que se cobra de verdad: la landing no puede anunciar un
 * número y el checkout cobrar otro.
 */
export const DISPLAY_PRICE_ARS = CHECKOUT_ENABLED ? SUBSCRIPTION_PRICE_ARS : LIST_PRICE_ARS
