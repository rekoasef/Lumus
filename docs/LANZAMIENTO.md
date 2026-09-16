# Lumus — Plan de lanzamiento y marketing

Última revisión: 2026-09-16

Lumus pasa de ser una herramienta personal a ser **un producto que se le vende a gente**. Eso trae cosas que no son código: políticas que el usuario acepta, soporte, un precio que se actualiza sin romper la ley, facturación, y sobre todo **conseguir gente**. Este doc es el plan y el seguimiento de todo eso.

- Números de costos y de precio: `docs/NEGOCIO.md`
- Trabajo de código: `docs/BACKLOG.md` (ronda 7)

> **Expectativa honesta, escrita a propósito.** Lo más probable es que Lumus pase **meses con cero, uno o dos usuarios pagos**. Muchos van a usar el mes gratis y darse de baja. Eso no es que el plan falló: es el punto de partida normal de cualquier producto sin audiencia. En palabras del dueño: *"peor es quedarse con la duda"*. **Al principio el éxito no se mide en ingresos, sino en aprender por qué la gente se queda o se va.**

---

## 1. Qué quedó decidido (2026-09-16)

| Tema | Decisión |
|---|---|
| **Precio** | **El equivalente a 5 USD, cobrado en pesos** (~7.800 ARS/mes al blue de 1.560). En pesos a propósito: mucha gente en Argentina no paga algo que ve en dólares, aunque valga lo mismo, por la tarjeta y los recargos. |
| **Actualización** | El precio en pesos se actualiza **cada cierto tiempo** (6 meses o 1 año, a definir) para que siga valiendo ~5 USD. Lo fija el dueño a mano, no una fórmula automática. |
| **Prueba** | Primer mes gratis. |
| **Soporte** | `gestorlumus@gmail.com` |
| **Landing** | Se hace (`H5`). |
| **Marketing** | Se arma plan y seguimiento (este doc). |
| **VPS** | Descartada. Se queda en Vercel + Supabase (`docs/NEGOCIO.md`). |
| **Plan Pro a futuro** | Idea: carga de gastos y consultas por WhatsApp (sección 9). |
| **Cuándo se activa el cobro** | **Primero se consiguen ~10 usuarios y se les da un mes gratis.** Recién ahí, el mismo día: monotributo, Vercel Pro y precio activo. Ver abajo. |

### Cuándo se activa el cobro (decidido el 2026-09-16)

Con un solo cliente, Lumus pierde plata aunque no existiera el monotributo: entran ~7.200 y Vercel Pro solo ya son ~31.000. Por eso **no se cobra hasta tener una base**:

1. **Etapa gratis**: se buscan ~10 usuarios con acceso gratis de un mes (`free_access_grants` con `expires_at`, sin tarjeta). Vercel sigue en **Hobby**, que lo permite mientras nadie pague, y no hace falta monotributo.
2. **Antes de que venza el mes**: se les avisa el precio y se los invita a suscribirse. Como la prueba es sin tarjeta, suscribirse es un paso que tienen que dar ellos: mandarles recordatorios.
3. **El día que se activa el cobro, todo junto**: inscripción al monotributo, Vercel a Pro, precio real en `SUBSCRIPTION_PRICE_ARS`, y lo de `H6` listo.
4. **No todos van a pagar.** Contar con que convierta una parte de los 10, no todos. Si se decide dar precio de fundador (35%), cada uno deja menos (~4.600 netos en vez de ~7.200): hacer la cuenta contra Vercel más la cuota real del monotributo antes de activar.
5. **Si de los ~10 no paga casi nadie**, es la respuesta que se buscaba, y se obtuvo sin haber pagado nada. Volver a la sección 8 para ver en qué paso se perdió la gente.

**No se cobra en negro ni desde Hobby**, ni siquiera "hasta ver si funciona". No facturar es causal de exclusión del monotributo, y Vercel puede pausar un proyecto Hobby con uso comercial, que con clientes pagando es el peor momento posible.

## 2. Qué falta decidir

| Tema | Opciones | Recomendación |
|---|---|---|
| **Cada cuánto se ajusta el precio** | 6 meses o 1 año | **6 meses.** Con la inflación, un año de atraso es mucho, y ajustes chicos se sienten menos que uno grande. |
| **Precio de fundador** | Sin fundadores, o primeros 30 con un % de descuento para siempre | **Sí, con 35% (~5.000 ARS).** Da una razón honesta para entrar ya, y un % se ajusta junto con el precio. |
| **Prueba con o sin tarjeta** | Sin tarjeta: más gente prueba y menos paga. Con tarjeta: menos gente prueba, pero se cobra sola al terminar. | **Sin tarjeta al principio.** Sin audiencia, lo que importa es que la prueben. Además ya existe la mecánica (`free_access_grants` con `expires_at`), y no hay cobros sorpresa que terminen en reclamo. Revisarlo cuando haya volumen. |
| **Plan anual** | Sí o no | Dejarlo para después. Con un precio que se ajusta cada 6 meses, un anual en pesos es una apuesta contra la inflación. |
| **Dónde vive la landing** | Subdominio, o dominio principal con la app en `app.` | Ver `H5`. |
| **Datos de quien se da de baja** | Se guardan N días, se exportan, se borran | Decidirlo antes del primer cliente (`H3`). |

---

## 3. Lo que exige cobrar en Argentina

**Esto no es asesoramiento legal.** Son las obligaciones que aparecieron al investigar el 2026-09-16. **Antes de cobrar, conviene una consulta con un contador y, si se puede, con un abogado.** Es una inversión chica frente al riesgo.

### Defensa del consumidor (Ley 24.240)

- **Botón de arrepentimiento**: quien contrata online puede revocar la compra dentro de los **10 días hábiles**, sin costo y sin tener que registrarse ni hacer trámites para pedirlo. Tiene que ser un link visible desde la página principal.
- **Botón de baja**: darse de baja tiene que ser tan fácil como darse de alta. `api/billing/cancel-subscription` existe; falta que se vea en la app (`H3`, punto 5).
- Las dos cosas las regulaba la Resolución 424/2020. **Hoy rige la Disposición 954/2025**, que la derogó y unificó los dos botones. Leer la norma vigente antes de implementarlos.
- **Aumentos de precio**: hay que **avisar antes** (las fuentes hablan de 15 a 30 días; usar **30** para ir a lo seguro), publicarlo, y **decir en el aviso que el usuario puede darse de baja sin costo** si no está de acuerdo. Algunas fuentes piden además **consentimiento previo** para cobrar más. Eso encaja con la incógnita de Mercado Pago (sección 4).

### Datos personales (Ley 25.326)

- Lumus guarda datos personales **y financieros** de terceros. Hay que **inscribir la base en el Registro Nacional de Bases de Datos** de la AAIP (trámite por TAD) y mantener la inscripción al día.
- Hace falta una **política de privacidad**: qué se guarda, para qué, con quién se comparte y cómo pedir el acceso o el borrado. Los proveedores que tocan datos son Supabase, Vercel, Resend, Anthropic (los informes), Mercado Pago y Sentry.

### Facturación (monotributo)

- Un monotributista tiene que emitir **factura C por cada venta o servicio**, sin importar el monto. No facturar bien es causal de exclusión del régimen.
- **Rige desde el primer cobro, sin mínimo.** Mientras Lumus sea gratis (beta, testers) no hay nada que facturar. **Inscribirse al monotributo justo antes de activar el precio**, no antes. No cobrar en negro: Mercado Pago informa los movimientos a ARCA.
- **Cuota (agosto 2026)**: categoría A de servicios, **49.527 ARS/mes**, con un tope de 12.009.410 ARS/año (~128 clientes a 7.800). Esa cuota suma impuesto integrado, jubilación y obra social. **Quien además trabaja en relación de dependencia paga solo el impuesto integrado**, que es una fracción de ese número, porque la jubilación y la obra social ya las aporta el empleador. Es el caso del dueño: **confirmarlo con el contador**, junto con Ingresos Brutos de la provincia.
- **Sin ese beneficio, la cuota completa se come los primeros ~7 clientes.** Con él, probablemente alcance con uno o dos (confirmar el monto del impuesto integrado).
- **Los primeros ~20 clientes se pueden facturar a mano** (Comprobantes en línea de ARCA): una factura C por cliente por mes, a consumidor final.
- **Con 100 usuarios son 100 facturas por mes.** Hacerlas a mano no escala: hay que automatizarlas (servicios con API para ARCA, o disparar la factura desde el webhook de pago). Ver con el contador qué categoría corresponde y si "software como servicio" entra como servicio.

### Lo que tiene que aceptar el usuario

1. **Términos y condiciones**: qué es Lumus, precio y cómo se actualiza, prueba gratis, baja, arrepentimiento, qué pasa con los datos al irse, límites de responsabilidad y soporte.
2. **Política de privacidad** (arriba).
3. **Aviso de que Lumus no es asesoramiento financiero.** Ya es una regla del producto (la IA no recomienda inversiones, `D4`); tiene que estar escrito también para el usuario.
4. **Cómo se acepta**: un checkbox en el registro que guarda **qué versión** aceptó y **cuándo**. Cuando cambian los términos, se pide aceptar de nuevo. Esto es una migración (una columna en `user_profiles` o una tabla de aceptaciones).

---

## 4. Actualización del precio: qué se puede y qué no

| Paso | Estado |
|---|---|
| Cambiar el precio para los **nuevos** | Fácil: `SUBSCRIPTION_PRICE_ARS` en `src/lib/billing/plan.ts`. |
| Cambiar el monto de las suscripciones **que ya existen** | **Sin confirmar.** Mercado Pago documenta `PUT /preapproval/{id}` con `auto_recurring.transaction_amount`, pero no dice si el usuario tiene que volver a autorizar. **Hay que probarlo con una tarjeta real antes de lanzar.** |
| Avisar 30 días antes | A construir: el motor de avisos ya existe (`C4`/`C5`). Es un tipo de aviso nuevo, más un banner. |
| Permitir la baja sin costo ante el aumento | Lo cubre el botón de baja (`H3`). |

**Si el `PUT` funciona sin pedir nada:** avisar con 30 días, y el día del ajuste un script recorre las suscripciones y actualiza el monto.

**Si el `PUT` pide autorizar de nuevo:** el aumento pasa a ser un paso del usuario ("tu suscripción necesita confirmar el nuevo precio"). Es más fricción, pero también cumple con el consentimiento previo. Quien no confirma sigue al precio viejo hasta una fecha límite, y después se le pide volver a suscribirse.

**La regla a escribir en los términos:** "El precio se revisa cada 6 meses (o 12) para mantener su valor. Te avisamos con 30 días de anticipación y podés darte de baja sin costo."

---

## 5. Soporte

- **Canal**: `gestorlumus@gmail.com`. Tiene que aparecer en la landing, en la app (perfil y pie), en los mails y en los términos.
- **Más adelante**: `soporte@gestorlumus.site` se ve más serio. Se puede reenviar a la misma casilla de Gmail con un servicio de reenvío de mails del dominio. No es urgente.
- **Tiempo de respuesta prometido**: **48 horas hábiles.** Es realista con un trabajo de tiempo completo. Prometer menos y cumplir.
- **Preguntas frecuentes** en la landing: cómo cancelo, qué pasa con mis datos, cuándo me cobran, por qué cambia el precio, si es seguro.
- **Respuestas guardadas** en Gmail para las preguntas que se repiten.
- **El botón de feedback in-app (`B5`) ya existe.** Mencionarlo en el onboarding.

---

## 6. Marketing

### A quién le habla Lumus

No a "todo el que gasta plata". Al principio, a gente **a la que le duele el problema específico que Lumus resuelve**:

1. **Quien cobra en dólares o ahorra en dólares**: freelancers, programadores, diseñadores, gente que trabaja para afuera. Les importa saber qué pasa con su plata entre pesos y dólares.
2. **Monotributistas**, con ingresos variables y varias billeteras.
3. **Gente que ya intentó con una planilla de Excel** y la abandonó.

### El mensaje

**"Lumus sabe que tus pesos se devalúan."** Las apps de afuera asumen que la plata mantiene su valor. Acá, "ahorraste 200 mil" no dice nada sin saber qué hizo el dólar (`D1`–`D4`). Ese es el diferencial, no "controlá tus gastos".

### La mejor carta: una herramienta gratis

Lumus ya tiene **15 años de historia del dólar blue** en la base (`D1`). Una **calculadora pública en la landing**, sin registro, del tipo *"¿Cuánto perdieron tus pesos?"* (ponés un monto y una fecha, y te dice cuánto vale hoy en dólares):

- Da algo útil gratis y se comparte sola.
- Muestra el diferencial en diez segundos.
- Termina en *"¿querés verlo con tu plata de verdad? Probá Lumus un mes gratis"*.

### Canales, en orden de prioridad (presupuesto inicial: 0)

| Canal | Qué hacer | Frecuencia |
|---|---|---|
| **Construir en público** (X/Twitter, LinkedIn) | Contar que estás armando Lumus: decisiones, números, errores. La gente sigue historias, no productos. | 2-3 posts por semana |
| **Videos cortos** (TikTok, Reels, Shorts) | Datos de la calculadora ("100 mil pesos de 2020 hoy son..."), pantallazos de Lumus y tips de finanzas en contexto argentino. | 2 por semana |
| **Comunidades** (Reddit r/argentina, r/merval, grupos de freelancers y monotributistas) | **Aportar, no spamear.** Responder dudas de finanzas y mencionar Lumus solo cuando viene al caso. | Semanal |
| **Boca a boca / referidos** | "Invitá a alguien y los dos tienen un mes gratis". Hay que construirlo. | Después de la beta |
| **Tu red** | Amigos, compañeros de trabajo, familia. No como clientes, sino para que lo compartan. | Al lanzar |
| **Publicidad paga** | Pruebas chicas (ej: 10-20 USD) **solo cuando la landing convierta**. Pagar para mandar gente a una landing que no convence es tirar la plata. | Más adelante |

### Contenido para arrancar

- "Cuánto perdió tu aguinaldo de 2023 por dejarlo en pesos"
- "Armé una app de finanzas porque ninguna entendía la inflación"
- "Lo que aprendí cargando 2.000 gastos a mano durante X meses" (el dueño tiene 2.306 transacciones: es una historia real)
- Pantallazos del informe mensual de la IA (con datos de ejemplo, nunca reales)

---

## 7. Que no se vayan después del mes gratis

La mayoría de las bajas de una prueba gratis pasan porque **la persona nunca llegó a ver el valor**: cargó dos gastos y se olvidó. Lumus muestra su valor recién después de semanas de uso, así que el mes tiene que estar diseñado.

1. **Activación**: definirla y medirla. Propuesta: *cargó gastos al menos 5 días distintos en la primera semana*. Quien llega ahí tiene muchas más chances de pagar.
2. **Mails durante la prueba** (usando el motor de `C4`):
   - Día 1: bienvenida y cómo cargar un gasto en 5 segundos (PWA, `C6`).
   - Día 3: si no cargó nada, un recordatorio.
   - Día 7: tu primera semana en números.
   - Día 25: tu prueba termina en 5 días, esto es lo que Lumus sabe de tu plata.
3. **El informe mensual de la IA antes de que termine la prueba.** Es el momento "wow". Asegurarse de que lo vean.
4. **Encuesta de baja**: una pregunta (*¿por qué te vas?*) al cancelar o al no pagar. Es la información más valiosa que va a tener Lumus.
5. **Recuperar**: a los 30 días de irse, un mail con lo que cambió desde entonces.

---

## 8. Seguimiento

### El embudo

| Etapa | Definición | Dónde se mide |
|---|---|---|
| Visitas | Entradas a la landing | Vercel Analytics (`G1` etapa 2) |
| Uso de la calculadora | Cálculos hechos | Evento propio |
| Registros | Cuentas creadas | Panel de admin (`G1`) |
| Activados | 5 días con gastos en la primera semana | Panel de admin (a sumar) |
| Pagos | Suscripciones `authorized` | Panel de admin |
| Bajas | Cancelaciones del mes, y por qué | Panel de admin + encuesta |

### Planilla semanal (llenar cada domingo)

| Semana | Visitas | Registros | Activados | Pagos nuevos | Bajas | Pagos activos | Qué hice de marketing | Qué aprendí |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

### Cuándo revisar el rumbo

- **A los 3 meses del lanzamiento**, mirar el embudo y buscar **dónde se corta**. Si nadie visita, el problema es la difusión. Si visitan y no se registran, es la landing. Si se registran y no se activan, es el producto (`H4`). Si se activan y no pagan, es el precio o el valor.
- **La pregunta no es "¿funcionó?"**, sino **"¿en qué etapa se pierde la gente?"**. Cada respuesta tiene un arreglo distinto.

---

## 9. Ideas a futuro: plan Pro con WhatsApp

Idea del dueño (2026-09-16), **no para ahora**:

- **Cargar un gasto por WhatsApp**, por texto o audio: *"gasté 5 mil en el súper con la Visa"*.
- **Preguntar por WhatsApp**: *"¿cuánto llevo gastado en comida este mes?"*.
- Podría ser un **plan Pro** más caro.

A tener en cuenta cuando llegue el momento:

- **Cuesta por uso**: la API de WhatsApp Business, la transcripción del audio y Claude para entender el mensaje. El precio del plan Pro tiene que cubrirlo (hacer la cuenta como en `docs/NEGOCIO.md`).
- **Se hace con n8n o directo desde la app.** n8n es otro servicio más para mantener. Una ruta en Next.js que reciba el webhook de WhatsApp puede alcanzar.
- **La carga sigue siendo del usuario.** El dueño prefiere carga manual y no clasificación automática. Acá es él quien dice el monto y la categoría; la IA solo lo pasa a formulario. Conviene **confirmar antes de guardar** ("¿Cargo 5.000 en Supermercado, Visa?").
- **Las consultas se responden con cifras calculadas por código**, no por el modelo. Es la misma regla de siempre: *la IA no calcula, explica*.

---

## 10. Orden de trabajo

| # | Fase | Qué | Ticket |
|---|---|---|---|
| 1 | Producto confiable | Que no mienta, ojos en producción, que el cobro no falle, que se entienda | `H1`–`H4` |
| 2 | Legal y operativo | Términos, privacidad, aceptación, botones de arrepentimiento y baja, AAIP, facturación, Vercel/Supabase Pro | `H6` |
| 3 | Precio | Cerrar lo abierto de la sección 2, probar el `PUT`, poner el precio real | `C8` |
| 4 | Landing | Landing, calculadora, preguntas frecuentes, soporte visible, analytics | `H5` |
| 5 | Primeros ~10 usuarios | Un mes gratis, mails de la prueba, testimonios. **Al final: activar el cobro** (monotributo, Vercel Pro y precio, el mismo día) | `C8` |
| 6 | Lanzamiento | Marketing semanal y planilla de seguimiento | este doc |
| 7 | Plan Pro | WhatsApp | a futuro |

Las fases 1 a 3 pueden avanzar en paralelo en lo que no es código: la consulta con el contador y el trámite de la AAIP no dependen de nada.

---

## Fuentes (consultadas el 2026-09-16)

- [Resolución 424/2020 — Botón de arrepentimiento (Boletín Oficial)](https://www.boletinoficial.gob.ar/detalleAviso/primera/235729/20201005)
- [Ley simple: Botón de arrepentimiento — Argentina.gob.ar](https://www.argentina.gob.ar/justicia/derechofacil/leysimple/boton-arrepentimiento)
- [Disposición 954/2025: nueva reglamentación de los botones de arrepentimiento y baja — Nicholson y Cano](https://nicholsonycano.com.ar/alertas-legales/disposicion-ministerio-de-economia-954-2025-nueva-reglamentacion-sobre-boton-de-arrepentimiento-y-boton-de-baja-de-servicio/)
- [Disposición 945/2025 — Abeledo Gottheil](https://abeledogottheil.com.ar/defensa-del-consumidor-disposicion-945-2025-modificaciones-en-el-boton-de-arrepentimiento-y-de-baja-de-servicios/)
- [Ley simple: Defensa del Consumidor — Argentina.gob.ar](https://www.argentina.gob.ar/justicia/derechofacil/leysimple/defensa-del-consumidor)
- [Los aumentos de precio en los servicios — Justicia Colectiva](https://justiciacolectiva.org.ar/los-aumento-de-precio-en-los-servicios/)
- [Protección de datos personales — AAIP](https://www.argentina.gob.ar/aaip/datospersonales)
- [Registro de bases de datos ante la AAIP — JBB Abogados](https://jbbabogados.com.ar/registro-de-bases-de-datos-personales-en-argentina-cuando-corresponde-inscribirlas-ante-la-aaip-y-como-hacerlo/)
- [Monotributo: escalas e importes desde agosto 2026 — iProfesional](https://www.iprofesional.com/impuestos/461293-monotributo-asi-quedan-las-escalas-topes-e-importes-a-pagar-desde-agosto-2026)
- [Tipos de monotributo — ARCA](https://www.afip.gob.ar/monotributo/ayuda/tipos-de-monotributo.asp)
- [Factura C 2026 — garca.app](https://garca.app/monotributo/factura-c)
- [Cómo facturar como monotributista en ARCA 2026 — aFacturar](https://afacturar.com.ar/blog/como-facturar-monotributista-arca/)
- [Mercado Pago — Suscripciones con plan asociado](https://www.mercadopago.com.uy/developers/es/docs/subscriptions/integration-configuration/subscription-associated-plan)
- [Mercado Pago — Actualizar suscripción (PUT)](https://www.mercadopago.com.co/developers/es/reference/subscriptions/_preapproval_id/put)
