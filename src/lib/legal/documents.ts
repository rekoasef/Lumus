import { SUBSCRIPTION_PRICE_ARS, TRIAL_DAYS } from '@/lib/billing/plan'
import { PAYMENT_GRACE_DAYS } from '@/lib/billing/access'
import { formatCurrency } from '@/lib/utils/format-currency'
import {
  DATA_ACCESS_DAYS,
  DATA_DELETION_BUSINESS_DAYS,
  LEGAL_OWNER,
  LEGAL_PATHS,
  TERMS_UPDATED_LABEL,
  WITHDRAWAL_BUSINESS_DAYS,
} from './owner'

/**
 * Los términos y la política de privacidad, como datos.
 *
 * **Esto no es asesoramiento legal**: está escrito a partir de lo investigado
 * en `docs/LANZAMIENTO.md` (sección 3) y conviene que lo revise un abogado.
 * Los números (precio, prueba, plazos) salen de las mismas constantes que usa
 * la app, para que el texto no diga una cosa y el código haga otra.
 *
 * Si cambia algo que importa, subir `TERMS_VERSION`: todos van a tener que
 * aceptar de nuevo.
 *
 * No menciona facturas a propósito (decisión del dueño, 2026-09-17): todavía
 * no está inscripto y no se mandan por mail. Cuando se facture, volver a
 * decirlo acá.
 */

export interface LegalSection {
  title: string
  paragraphs: readonly string[]
  bullets?: readonly string[]
}

export interface LegalDocument {
  title: string
  updated: string
  intro: string
  sections: readonly LegalSection[]
}

const PRICE = formatCurrency(SUBSCRIPTION_PRICE_ARS, 'ARS', 'rounded')
const OWNER_LINE = `${LEGAL_OWNER.name}, CUIT ${LEGAL_OWNER.cuit}, con domicilio en ${LEGAL_OWNER.address}`

export const TERMS: LegalDocument = {
  title: 'Términos y condiciones',
  updated: TERMS_UPDATED_LABEL,
  intro:
    'Estos términos explican cómo funciona Lumus, cuánto cuesta y qué podés esperar de nosotros. Al crear una cuenta los aceptás, junto con la política de privacidad.',
  sections: [
    {
      title: '1. Quién presta el servicio',
      paragraphs: [
        `Lumus es un servicio de ${OWNER_LINE}. Contacto: ${LEGAL_OWNER.email}.`,
      ],
    },
    {
      title: '2. Qué es Lumus',
      paragraphs: [
        'Lumus es una aplicación web para registrar y ordenar tus finanzas personales: billeteras, gastos e ingresos, presupuestos, pagos fijos, metas de ahorro y préstamos. Todo lo cargás vos, a mano. Lumus no se conecta con tu banco ni mueve dinero.',
        'Lumus puede generar, cuando se lo pedís, un informe mensual y un análisis de tu patrimonio con inteligencia artificial. También muestra cotizaciones del dólar, cripto y acciones con fines informativos.',
      ],
    },
    {
      title: '3. Lumus no es asesoramiento financiero',
      paragraphs: [
        'Lumus no es una entidad financiera, no está registrado ante la Comisión Nacional de Valores y no recomienda inversiones. Los informes explican los datos que cargaste; no son consejos de inversión, impositivos ni legales.',
        'Los textos generados con inteligencia artificial pueden contener errores. Las cotizaciones vienen de fuentes de terceros y pueden estar demoradas o ser inexactas. Las decisiones sobre tu dinero son tuyas.',
      ],
    },
    {
      title: '4. Tu cuenta',
      paragraphs: [
        'Para usar Lumus tenés que ser mayor de 18 años y registrarte con un correo electrónico propio. La cuenta es personal: cuidá tu contraseña y avisanos si creés que alguien más entró.',
        'Los datos que cargás son tuyos. No los usamos para otra cosa que prestarte el servicio (ver la política de privacidad).',
      ],
    },
    {
      title: '5. Prueba gratis',
      paragraphs: [
        `Al registrarte tenés ${TRIAL_DAYS} días de acceso completo sin cargar ninguna tarjeta. Cuando la prueba termina no se cobra nada de forma automática: para seguir usando Lumus tenés que suscribirte. Si no lo hacés, tu cuenta y tus datos quedan guardados (punto 10).`,
      ],
    },
    {
      title: '6. Precio y forma de pago',
      paragraphs: [
        `La suscripción cuesta ${PRICE} por mes, en pesos argentinos, e incluye todas las funciones. Se paga por Mercado Pago con débito automático mensual: los datos de tu tarjeta los maneja Mercado Pago y Lumus nunca los ve.`,
        'Si te suscribís durante la prueba gratis, el primer cobro se hace el día que la prueba termina, y después cada mes.',
        `Si un cobro falla, conservás el acceso ${PAYMENT_GRACE_DAYS} días más mientras Mercado Pago lo reintenta.`,
      ],
    },
    {
      title: '7. Actualización del precio',
      paragraphs: [
        'El precio se revisa cada seis meses para mantener su valor frente a la inflación. Antes de cualquier aumento te avisamos con al menos 30 días de anticipación, por correo electrónico y dentro de la aplicación, y podés darte de baja sin ningún costo si no estás de acuerdo.',
      ],
    },
    {
      title: '8. Baja del servicio',
      paragraphs: [
        `Podés darte de baja cuando quieras, sin costo y sin dar explicaciones: desde tu perfil, o desde el botón de baja del servicio (${LEGAL_OWNER.site}${LEGAL_PATHS.cancellation}), que no pide iniciar sesión. Te damos un código de identificación de la solicitud en el momento.`,
        'Al darte de baja no se hacen más cobros y conservás el acceso hasta el final del período que ya pagaste. No se reintegran períodos parciales, salvo en el caso del punto 9.',
      ],
    },
    {
      title: '9. Derecho de arrepentimiento',
      paragraphs: [
        `Tenés ${WITHDRAWAL_BUSINESS_DAYS} días hábiles desde que te suscribiste para arrepentirte, sin costo y sin dar motivos (artículo 34 de la Ley 24.240). Lo podés pedir desde el botón de arrepentimiento (${LEGAL_OWNER.site}${LEGAL_PATHS.withdrawal}), que no pide iniciar sesión. Te damos un código de identificación en el momento, cancelamos la suscripción y te devolvemos lo que se te haya cobrado, por el mismo medio de pago.`,
      ],
    },
    {
      title: '10. Tus datos cuando te vas',
      paragraphs: [
        'Si terminás la prueba sin suscribirte o te das de baja, tu cuenta y tus datos quedan guardados para que puedas volver cuando quieras y encontrar todo como estaba.',
        `Si preferís que los borremos, podés eliminar la cuenta vos mismo desde tu perfil, con tu contraseña: se cancela la suscripción y se borra todo en el momento. También podés escribirnos a ${LEGAL_OWNER.email} desde el correo de tu cuenta, y lo hacemos dentro de los ${DATA_DELETION_BUSINESS_DAYS} días hábiles.`,
      ],
    },
    {
      title: '11. Uso aceptable',
      paragraphs: [
        'No uses Lumus para actividades ilegales, para cargar datos de otras personas sin su permiso, ni para intentar acceder a cuentas ajenas, sobrecargar el servicio o vulnerar su seguridad. Podemos suspender una cuenta que lo haga.',
      ],
    },
    {
      title: '12. Disponibilidad y responsabilidad',
      paragraphs: [
        'Hacemos lo posible para que Lumus funcione siempre y tus datos estén seguros, pero puede haber interrupciones por mantenimiento o por fallas de los proveedores que usamos. Si una falla te impide usar el servicio por un período largo, escribinos.',
        'Lumus no responde por las decisiones que tomes a partir de la información de la aplicación (punto 3), en la medida en que la ley lo permita. Nada en estos términos limita los derechos que te da la Ley 24.240 de Defensa del Consumidor.',
      ],
    },
    {
      title: '13. Cambios en estos términos',
      paragraphs: [
        'Si cambiamos algo importante, te avisamos y te pedimos que aceptes la nueva versión al entrar a la aplicación. Si no estás de acuerdo, podés darte de baja sin costo.',
      ],
    },
    {
      title: '14. Soporte y reclamos',
      paragraphs: [
        `Escribinos a ${LEGAL_OWNER.email}. Respondemos dentro de las 48 horas hábiles.`,
        'También podés hacer un reclamo ante la autoridad de Defensa del Consumidor, en argentina.gob.ar/produccion/defensadelconsumidor/formulario.',
      ],
    },
    {
      title: '15. Ley aplicable',
      paragraphs: [
        'Estos términos se rigen por las leyes de la República Argentina. Para cualquier conflicto es competente la justicia del domicilio del consumidor.',
      ],
    },
  ],
}

export const PRIVACY: LegalDocument = {
  title: 'Política de privacidad',
  updated: TERMS_UPDATED_LABEL,
  intro:
    'Lumus guarda información sensible: tu plata. Esta política explica qué datos guardamos, para qué, con quién se comparten y cómo pedir que los veamos, corrijamos o borremos, según la Ley 25.326 de Protección de Datos Personales.',
  sections: [
    {
      title: '1. Responsable',
      paragraphs: [
        `El responsable de los datos es ${OWNER_LINE}. Contacto: ${LEGAL_OWNER.email}.`,
      ],
    },
    {
      title: '2. Qué datos guardamos',
      paragraphs: ['Solo los necesarios para que Lumus funcione:'],
      bullets: [
        'Cuenta: correo electrónico y contraseña (guardada cifrada: nadie puede leerla, tampoco nosotros).',
        'Perfil: nombre y, si lo completás, tu ingreso mensual.',
        'Tus finanzas: billeteras, movimientos, categorías, presupuestos, pagos fijos, metas, préstamos e inversiones que cargás.',
        'Pagos: el estado y el identificador de tu suscripción de Mercado Pago. Los datos de tu tarjeta los guarda Mercado Pago, no Lumus.',
        'Uso: cuándo creaste la cuenta y entraste por última vez, y los mensajes que nos mandás desde la aplicación.',
        'Técnicos: registros de errores y de acceso (como la dirección IP) que generan los servidores, para detectar fallas y abusos.',
      ],
    },
    {
      title: '3. Para qué los usamos',
      paragraphs: [
        'Para prestarte el servicio: mostrarte tus números, generar los informes que pedís, mandarte los avisos que elegiste, cobrar la suscripción y responder tus consultas.',
        'Para mejorar Lumus miramos cantidades de uso (por ejemplo, cuántos movimientos se cargan por mes), nunca los montos ni lo que escribís en ellos. No vendemos tus datos, no los usamos para publicidad y no los compartimos con nadie para otros fines.',
      ],
    },
    {
      title: '4. Con quién se comparten',
      paragraphs: [
        'Usamos proveedores que procesan datos por cuenta de Lumus, solo para lo que se indica. Sus servidores pueden estar fuera de la Argentina; al usar Lumus aceptás esa transferencia internacional, con las medidas de seguridad del punto 7.',
      ],
      bullets: [
        'Supabase: base de datos y cuentas de usuario.',
        'Vercel: alojamiento de la aplicación.',
        'Anthropic: genera los informes y análisis con inteligencia artificial. Solo recibe un resumen de tus datos del período, y solo cuando lo pedís. Según sus condiciones, no usa esos datos para entrenar sus modelos.',
        'Mercado Pago: cobra la suscripción.',
        'Resend: envía los correos electrónicos.',
        'Sentry: registra errores de la aplicación, sin datos financieros.',
      ],
    },
    {
      title: '5. Cuánto tiempo los guardamos',
      paragraphs: [
        `Mientras tu cuenta exista, aunque no tengas una suscripción activa, para que puedas volver. Si eliminás la cuenta desde tu perfil, se borra con todos sus datos en el momento; si nos lo pedís por correo, dentro de los ${DATA_DELETION_BUSINESS_DAYS} días hábiles. Las copias de seguridad cifradas se renuevan periódicamente.`,
      ],
    },
    {
      title: '6. Tus derechos',
      paragraphs: [
        `Podés pedir ver los datos que tenemos de vos (te respondemos dentro de los ${DATA_ACCESS_DAYS} días corridos), corregirlos o borrarlos (dentro de los ${DATA_DELETION_BUSINESS_DAYS} días hábiles), escribiendo a ${LEGAL_OWNER.email} desde el correo de tu cuenta. Muchos los podés corregir vos mismo desde la aplicación, y podés eliminar la cuenta entera con todos sus datos desde tu perfil.`,
        'El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley N° 25.326.',
        'La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.',
      ],
    },
    {
      title: '7. Seguridad',
      paragraphs: [
        'Toda la comunicación viaja cifrada (HTTPS). Cada cuenta solo puede leer sus propios datos: la base de datos lo impone en cada consulta, no solo la pantalla. Las contraseñas se guardan cifradas y las copias de seguridad también.',
      ],
    },
    {
      title: '8. Cookies',
      paragraphs: [
        'Lumus usa solo las cookies necesarias para mantener tu sesión iniciada. No usa cookies de publicidad ni de seguimiento de terceros.',
      ],
    },
    {
      title: '9. Menores de edad',
      paragraphs: ['Lumus no está pensado para menores de 18 años y no guardamos datos de menores a sabiendas.'],
    },
    {
      title: '10. Cambios en esta política',
      paragraphs: [
        'Si cambiamos algo importante, te avisamos y te pedimos que aceptes la nueva versión al entrar a la aplicación.',
      ],
    },
  ],
}
