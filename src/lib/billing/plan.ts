/**
 * El precio decidido el 2026-09-16: el equivalente a 5 USD, cobrado en pesos, y
 * revisado cada 6 meses (`docs/NEGOCIO.md`). Cambiarlo solo afecta a las
 * suscripciones nuevas: el monto de las existentes vive en Mercado Pago.
 */
export const SUBSCRIPTION_PRICE_ARS = 7800
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
 * Si se puede pagar una suscripción. **Prendido desde el 2026-09-17**, por
 * decisión del dueño, para que el cobro quede listo y no se arme a último
 * momento.
 *
 * Por qué eso no cobra nada todavía: todo el que se registra tiene 30 días de
 * prueba, y `start_date` hace que el primer cobro caiga el día que termina. El
 * dueño y los testers tienen accesos gratis sin vencimiento, así que
 * `/suscripcion` ni siquiera les ofrece pagar. **El primer cobro posible es el
 * fin de la prueba del primer suscriptor**: antes de esa fecha tienen que estar
 * el monotributo, Vercel Pro y lo legal de `H6` (`docs/LANZAMIENTO.md`).
 *
 * Apagado, `/suscripcion` no muestra el botón de pago y la API rechaza el
 * checkout: la pantalla y la API tienen que decir lo mismo.
 */
export const CHECKOUT_ENABLED = true
