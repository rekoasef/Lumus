/**
 * Los textos de la landing, todos juntos.
 *
 * La landing se va a corregir muchas veces, y casi siempre en las palabras:
 * tenerlas en un solo lugar es lo que hace que cambiar el tono no sea recorrer
 * doce componentes.
 */

export const NAV = {
  login: 'Ingresar',
  cta: 'Probar gratis',
}

export const HERO = {
  eyebrow: 'Gestor de gastos con IA',
  title: ['Tu plata,', 'por fin clara.'],
  subtitle:
    'Lumus ordena tus gastos y, cada mes, su inteligencia artificial te arma un informe que explica en qué se fue tu plata y qué le hizo el dólar.',
  cta: 'Probar 30 días gratis',
  secondary: 'Ver cómo funciona',
  note: 'Sin tarjeta. Cancelás cuando quieras.',
  scroll: 'Deslizá',
}

export const STATEMENT = 'Vos anotás lo que gastás. Lumus entiende el resto y te lo cuenta cada mes, en simple.'

export const REPORT = {
  eyebrow: 'Informe mensual con IA',
  title: 'Cada mes, un informe que te habla claro.',
  body: 'Cuando termina el mes, Lumus mira el mes entero: cuánto entró, cuánto salió, qué categoría se disparó y cuánto valen tus ahorros en dólares. Después te lo explica como lo haría alguien que sabe de plata.',
  points: [
    { title: 'Tus números, calculados de verdad', text: 'Las cuentas las hace Lumus. La IA solo las explica, así nunca inventa una cifra.' },
    { title: 'En castellano, sin jerga', text: 'Qué pasó, por qué importa y qué mirar el mes que viene.' },
    { title: 'Neutral, siempre', text: 'Nunca te va a decir en qué invertir. Te muestra tu plata tal como está.' },
  ],
  card: {
    tag: 'Ejemplo',
    month: 'Informe de agosto',
    generated: 'Generado por Lumus',
    spent: 'Gastaste',
    spentValue: '$ 842.300',
    spentDelta: '12% menos que julio',
    saved: 'Ahorraste',
    savedValue: 'US$ 310',
    savedDelta: 'medido en dólares',
    categories: [
      { name: 'Supermercado', share: 31 },
      { name: 'Salidas', share: 18 },
      { name: 'Transporte', share: 12 },
    ],
    insightTitle: 'Lo que Lumus ve',
    insight:
      'Bajaste bastante las salidas, y eso explica casi todo el ahorro del mes. Ojo con el supermercado: subió dos meses seguidos. Tus pesos en la billetera perdieron un 3,1% frente al dólar; lo que tenías en dólares se mantuvo.',
  },
}

export const DEVALUATION = {
  eyebrow: 'Hecho para Argentina',
  title: ['Lumus sabe que', 'tus pesos se devalúan.'],
  body: 'Las apps de afuera dan por hecho que la plata mantiene su valor. Acá, "ahorré 200 mil" no dice nada si no sabés qué hizo el dólar. Lumus te muestra tu patrimonio en pesos y en dólares, y cuánto perdió lo que quedó quieto.',
  calculator: {
    title: '¿Cuánto perdieron tus pesos?',
    amount: 'Si tenías',
    month: 'en',
    year: 'de',
    thenLabel: 'Ese mes eran',
    nowLabel: 'Hoy son',
    lostLabel: 'Perdieron',
    gainedLabel: 'Ganaron',
    ofValue: 'de su valor en dólares',
    kept: 'Lumus te muestra esto con tu propia plata, todos los meses.',
    source: 'Dólar blue, promedio de compra y venta. Fuente: Bluelytics.',
    empty: 'Elegí un monto y una fecha.',
  },
}

export const FEATURES = {
  eyebrow: 'Todo en un lugar',
  title: 'Lo que necesitás para ordenar tu plata. Nada más.',
  items: [
    { key: 'fast', title: 'Cargar un gasto, en segundos', text: 'Se instala en el celular como una app. Tocás, escribís el monto y listo: recuerda tu categoría y tu billetera de siempre.' },
    { key: 'currency', title: 'Pesos y dólares', text: 'Billeteras en cualquier moneda y tu patrimonio total, en las dos.' },
    { key: 'budget', title: 'Presupuestos que avisan', text: 'Te avisa al llegar al 80% y cuando te pasás.' },
    { key: 'due', title: 'Nada se te vence', text: 'Pagos fijos y cuotas, con aviso por mail antes de la fecha.' },
    { key: 'goals', title: 'Metas de ahorro', text: 'Ponele un número a lo que querés y mirá cuánto te falta.' },
    { key: 'loans', title: 'Lo que debés y te deben', text: 'Préstamos con sus cuotas, sin planillas aparte.' },
  ],
}

export const STEPS = {
  eyebrow: 'Cómo funciona',
  title: 'Tres pasos. El resto lo hace Lumus.',
  items: [
    { title: 'Creá tu cuenta', text: '30 días gratis, sin cargar ninguna tarjeta.' },
    { title: 'Anotá tus gastos', text: 'Desde el celular, en el momento. Toma segundos.' },
    { title: 'Recibí tu informe', text: 'Cada mes, la IA te explica qué pasó con tu plata.' },
  ],
}

export const PRICING = {
  eyebrow: 'Precio',
  title: 'Un solo plan. Todo incluido.',
  plan: 'Lumus',
  perMonth: 'por mes',
  trialBadge: (days: number) => `${days} días gratis`,
  trial: 'Los primeros 30 días son gratis, sin tarjeta.',
  cta: 'Empezar la prueba gratis',
  includes: [
    'Gastos, ingresos y billeteras sin límite',
    'Informe mensual con IA',
    'Análisis de tu patrimonio en dólares',
    'Presupuestos, metas, pagos fijos y préstamos',
    'Avisos por mail y en la app',
  ],
  fine: 'Precio en pesos, revisado cada 6 meses con aviso previo. Cancelás cuando quieras.',
}

export const FAQ = {
  eyebrow: 'Preguntas frecuentes',
  title: 'Lo que suelen preguntar.',
  items: [
    { q: '¿Necesito una tarjeta para probarlo?', a: 'No. Te registrás con tu mail y tenés 30 días completos, sin cargar ningún medio de pago.' },
    { q: '¿Qué pasa cuando termina la prueba?', a: 'Te avisamos unos días antes. Si no seguís, tus datos quedan guardados y podés volver cuando quieras.' },
    { q: '¿Se conecta con mi banco?', a: 'No. Cargás vos tus movimientos, que es la mejor forma de saber en qué se va tu plata. Y Lumus nunca te pide acceso a tus cuentas bancarias.' },
    { q: '¿Qué hace la IA con mis datos?', a: 'Los usa para armar tu informe del mes y nada más. Las cuentas las hace Lumus; la IA las explica.' },
    { q: '¿Lumus me dice en qué invertir?', a: 'No, y a propósito. Te muestra tu plata con claridad, pero las decisiones son tuyas.' },
    { q: '¿Lo puedo usar en el celular?', a: 'Sí. Funciona en el navegador y se instala como app en Android y iPhone.' },
  ],
  contact: '¿Otra duda? Escribinos a',
}

export const FINAL_CTA = {
  title: 'Tu plata merece entenderse.',
  body: 'Probá Lumus 30 días. Sin tarjeta, sin compromiso.',
  cta: 'Crear mi cuenta',
}

export const FOOTER = {
  tagline: 'Gestor de gastos con IA, hecho en Argentina.',
  support: 'Soporte',
  login: 'Ingresar',
  register: 'Crear cuenta',
}
