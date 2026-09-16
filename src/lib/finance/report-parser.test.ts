import { describe, expect, it } from 'vitest'
import {
  getReportMonthLabel,
  isMetricsSection,
  isSummarySection,
  parseFinanceReportContent,
  stripReportMarkup,
} from './report-parser'

/**
 * Del otro lado de este parser hay un modelo escribiendo markdown, así que lo
 * que se prueba es tolerancia: títulos con o sin `##`, tablas con o sin bordes,
 * viñetas de cualquier tipo. Si el formato cambia un poco, el reporte tiene que
 * seguir mostrándose y no quedar en blanco.
 */

function parse(content: string) {
  return parseFinanceReportContent({ content, month: '2026-08', created_at: '2026-09-01T10:00:00Z' })
}

describe('stripReportMarkup', () => {
  it('saca encabezados, negritas y código', () => {
    expect(stripReportMarkup('## **Resumen** del `mes`')).toBe('Resumen del mes')
  })

  it('saca la viñeta del principio', () => {
    expect(stripReportMarkup('- Gastaste menos')).toBe('Gastaste menos')
    expect(stripReportMarkup('• Gastaste menos')).toBe('Gastaste menos')
    expect(stripReportMarkup('1. Gastaste menos')).toBe('Gastaste menos')
    expect(stripReportMarkup('2) Gastaste menos')).toBe('Gastaste menos')
  })

  it('normaliza los espacios de más', () => {
    expect(stripReportMarkup('Gastaste    mucho   menos')).toBe('Gastaste mucho menos')
  })
})

describe('getReportMonthLabel', () => {
  it('convierte el mes a texto', () => {
    expect(getReportMonthLabel('2026-08')).toMatch(/agosto de 2026/i)
  })

  // Si el mes viniera mal, mostrar el crudo es mejor que "Invalid Date".
  it('devuelve el valor original si no lo puede interpretar', () => {
    expect(getReportMonthLabel('no-es-un-mes')).toBe('no-es-un-mes')
  })
})

describe('parseFinanceReportContent', () => {
  it('parte el contenido en secciones por título', () => {
    const parsed = parse(['## Resumen del mes', 'Te fue bien.', '## Recomendaciones', 'Segui asi.'].join('\n'))

    expect(parsed.sections.map(s => s.title)).toEqual(['Resumen del mes', 'Recomendaciones'])
    expect(parsed.sections[0].paragraphs).toEqual(['Te fue bien.'])
  })

  // El modelo no siempre pone `##`. Los títulos conocidos se reconocen igual.
  it('reconoce un título conocido aunque venga sin almohadillas ni acentos', () => {
    const parsed = parse(['Gastos por categoria', 'Comida se llevó la mayor parte.'].join('\n'))
    expect(parsed.sections.map(s => s.title)).toEqual(['Gastos por categoria'])
  })

  // Sin esto, un reporte que arranca sin título perdería sus primeras líneas.
  it('el texto anterior al primer título no se pierde', () => {
    const parsed = parse('Agosto fue un mes tranquilo.')

    expect(parsed.sections).toHaveLength(1)
    expect(parsed.sections[0].title).toBe('Resumen del mes')
    expect(parsed.sections[0].paragraphs).toEqual(['Agosto fue un mes tranquilo.'])
  })

  it('lee una tabla y descarta su encabezado y su separador', () => {
    const parsed = parse([
      '## Ingresos y gastos',
      '| Concepto | Monto |',
      '| --- | --- |',
      '| Ingresos | $ 900.000 |',
      '| Gastos | $ 400.000 |',
    ].join('\n'))

    expect(parsed.sections[0].rows).toEqual([
      { label: 'Ingresos', value: '$ 900.000' },
      { label: 'Gastos', value: '$ 400.000' },
    ])
  })

  it('una fila de tabla con varias columnas junta los valores', () => {
    const parsed = parse(['## Presupuestos', '| Comida | $ 50.000 | 80% |'].join('\n'))
    expect(parsed.sections[0].rows).toEqual([{ label: 'Comida', value: '$ 50.000 · 80%' }])
  })

  it('separa las viñetas del texto corrido', () => {
    const parsed = parse(['## Recomendaciones', 'Dos ideas:', '- Cocinar más', '- Cancelar una suscripción'].join('\n'))

    expect(parsed.sections[0].items).toEqual(['Cocinar más', 'Cancelar una suscripción'])
    // La línea que las presenta queda como párrafo: termina en dos puntos sin
    // valor detrás, así que no es un dato.
    expect(parsed.sections[0].paragraphs).toEqual(['Dos ideas:'])
  })

  it('una línea "etiqueta: valor" se guarda como fila, no como párrafo', () => {
    const parsed = parse(['## Resumen del mes', 'Ahorro: $ 120.000'].join('\n'))
    expect(parsed.sections[0].rows).toEqual([{ label: 'Ahorro', value: '$ 120.000' }])
  })

  // Una oración larga con dos puntos en el medio es prosa, no un dato: como
  // etiqueta quedaría ilegible en la pantalla del reporte.
  it('una oración larga con dos puntos sigue siendo un párrafo', () => {
    const frase = 'Este mes gastaste bastante menos que el anterior y conviene mirar por qué: puede ser estacional'
    const parsed = parse(['## Resumen del mes', frase].join('\n'))

    expect(parsed.sections[0].rows).toEqual([])
    expect(parsed.sections[0].paragraphs).toEqual([frase])
  })

  it('un contenido vacío no rompe', () => {
    const parsed = parse('')
    expect(parsed.sections).toEqual([])
    expect(parsed.monthLabel).toMatch(/agosto de 2026/i)
  })

  it('las líneas en blanco no generan párrafos vacíos', () => {
    const parsed = parse(['## Resumen del mes', '', 'Todo bien.', '   ', ''].join('\n'))
    expect(parsed.sections[0].paragraphs).toEqual(['Todo bien.'])
  })
})

describe('isSummarySection / isMetricsSection', () => {
  it('reconocen su sección sin importar acentos ni mayúsculas', () => {
    const parsed = parse(['## RESUMEN DEL MES', 'Bien.', '## Ingresos y Gastos', 'Datos.'].join('\n'))

    expect(isSummarySection(parsed.sections[0])).toBe(true)
    expect(isMetricsSection(parsed.sections[0])).toBe(false)
    expect(isMetricsSection(parsed.sections[1])).toBe(true)
  })

  it('no confunden otra sección', () => {
    const parsed = parse(['## Recomendaciones', 'Algo.'].join('\n'))
    expect(isSummarySection(parsed.sections[0])).toBe(false)
    expect(isMetricsSection(parsed.sections[0])).toBe(false)
  })
})
