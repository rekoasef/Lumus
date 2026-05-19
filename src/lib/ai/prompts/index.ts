import type { UserSnapshot, AIModule } from '@/types'
import { BASE_SYSTEM_PROMPT } from './base'

export function getModulePrompt(module: AIModule, snapshot: UserSnapshot): string {
  const base = BASE_SYSTEM_PROMPT

  const contextoBase = `
Información del usuario:
- Nombre: ${snapshot.perfil.nombre}
- Edad: ${snapshot.perfil.edad} años
- Ocupación: ${snapshot.perfil.ocupacion ?? 'no especificada'}
- Contexto personal: ${snapshot.perfil.resumen_vida || 'no especificado'}
`

  switch (module) {
    case 'organizacion':
      return `${base}
${contextoBase}
Contexto de productividad:
- Tareas pendientes: ${snapshot.organizacion.tareas_pendientes}
- Completadas esta semana: ${snapshot.organizacion.tareas_completadas_semana}
- Tareas vencidas: ${snapshot.organizacion.tareas_vencidas}
- Próximas tareas: ${snapshot.organizacion.proximas_tareas.join(', ') || 'ninguna'}

Tu rol: asistente de productividad. Ayudás al usuario a organizar su tiempo, priorizar tareas y cumplir objetivos.`

    case 'finanzas': {
      const f = snapshot.finanzas
      const balance = f.ingresado_mes - f.gastado_mes
      const metasStr = f.metas_activas.length > 0
        ? f.metas_activas.map(m => `${m.nombre} (${m.progreso_pct}%)`).join(', ')
        : 'ninguna'
      return `${base}
${contextoBase}
Contexto financiero del mes actual:
- Gastado: $${Math.round(f.gastado_mes).toLocaleString('es-AR')}
- Ingresado: $${Math.round(f.ingresado_mes).toLocaleString('es-AR')}
- Balance del mes: $${Math.round(balance).toLocaleString('es-AR')} (${balance >= 0 ? 'positivo' : 'negativo'})
- Presupuesto total definido: $${Math.round(f.presupuesto_mes).toLocaleString('es-AR')}
- Categoría donde más se gasta: ${f.categoria_top_gasto}
- Días hasta fin de mes: ${f.dias_para_fin_mes}
- Suscripciones activas (costo mensual): $${f.total_suscripciones_mes.toLocaleString('es-AR')}
- Metas de ahorro activas: ${metasStr}

Tu rol: asesor financiero personal de ${snapshot.perfil.nombre}. Ayudás a entender su situación económica, detectar gastos excesivos, sugerir formas de ahorrar y tomar mejores decisiones con el dinero. Sé directo y concreto con los números.`
    }

    case 'fit': {
      const f = snapshot.fit
      return `${base}
${contextoBase}
Contexto de fitness y salud:
- Peso actual: ${f.peso_actual != null ? `${f.peso_actual} kg (${f.tendencia_peso})` : 'sin registro'}
- Entrenamientos esta semana: ${f.entrenos_semana}
- Rutinas guardadas: ${f.rutinas_guardadas}
- Agua tomada hoy: ${f.agua_hoy_ml} ml
- Horas de sueño anoche: ${f.sueno_anoche_h != null ? `${f.sueno_anoche_h}h` : 'sin registro'}

Tu rol: coach personal de fitness y bienestar de ${snapshot.perfil.nombre}. Ayudás a planificar entrenamientos, seguir el progreso corporal, hidratación y descanso. Sé motivador y específico con números.`
    }

    case 'comidas': {
      const c = snapshot.comidas
      return `${base}
${contextoBase}
Contexto nutricional de hoy:
- Calorías registradas hoy: ${c.calorias_hoy} kcal
- Comidas registradas hoy: ${c.comidas_registradas_hoy}
- Recetas guardadas: ${c.recetas_guardadas}
- Ítems pendientes en la lista del súper: ${c.items_lista_super}

Tu rol: nutricionista y coach de alimentación de ${snapshot.perfil.nombre}. Ayudás a registrar comidas, sugerir recetas saludables, armar listas del súper y entender el balance calórico. Sé práctico y motivador.`
    }

    case 'habitos':
      return `${base}
${contextoBase}
Contexto de hábitos:
- Estado hábitos semana: ${snapshot.habitos.gym}
- Mood promedio: ${snapshot.mood_semana}/5

Tu rol: coach de hábitos. Ayudás al usuario a construir rutinas y mantener consistencia.`

    case 'journal':
      return `${base}
${contextoBase}
Tu rol: compañero de reflexión emocional. Escuchás con empatía, sin juzgar, y ayudás al usuario a procesar sus pensamientos y emociones.`

    default:
      return `${base}
${contextoBase}
Tu rol: asistente personal integral de ${snapshot.perfil.nombre}.`
  }
}
