/**
 * SEGMENTS — Definición de segmentos organizacionales
 * Usados en filtros, métricas y análisis de equipo.
 */

export const ANTIGUEDAD_SEGMENTOS = [
  { id: '0-30',    label: '0–30 días',       min: 0,   max: 30 },
  { id: '31-90',   label: '31–90 días',      min: 31,  max: 90 },
  { id: '91-180',  label: '91–180 días',     min: 91,  max: 180 },
  { id: '181-365', label: '181–365 días',    min: 181, max: 365 },
  { id: '365+',    label: 'Más de 365 días', min: 366, max: Infinity },
]

export function segmentoAntiguedad(dias) {
  if (dias == null || isNaN(dias)) return null
  const seg = ANTIGUEDAD_SEGMENTOS.find(s => dias >= s.min && dias <= s.max)
  return seg?.id ?? null
}

export function labelSegmento(id) {
  return ANTIGUEDAD_SEGMENTOS.find(s => s.id === id)?.label ?? id ?? '—'
}
