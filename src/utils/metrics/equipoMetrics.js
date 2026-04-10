import { ANTIGUEDAD_SEGMENTOS, labelSegmento } from '../../config/segments.js'
export function calcComposicion(equipo) {
  if (!equipo?.length) return null
  const total = equipo.length
  const gc = (arr, fn) => { const m = new Map(); for (const e of arr) { const k = fn(e); m.set(k, (m.get(k)||0)+1) } return Array.from(m.entries()).map(([key,count])=>({key,count})).sort((a,b)=>b.count-a.count) }

  // Antigüedad promedio en días
  const conFecha = equipo.filter(e => e.antiguedadDias != null)
  const antiguedadPromDias = conFecha.length > 0
    ? Math.round(conFecha.reduce((s, e) => s + e.antiguedadDias, 0) / conFecha.length)
    : null

  // % perfiles nuevos (< 90 días = 3 meses aprox)
  const perfilesNuevos = equipo.filter(e => e.antiguedadDias != null && e.antiguedadDias < 90).length
  const pctPerfilesNuevos = total > 0 ? perfilesNuevos / total : null

  return {
    total,
    byRol:      gc(equipo, e => e.rol      || 'Sin rol'),
    byEquipo:   gc(equipo, e => e.equipo   || 'Sin equipo'),
    byUbicacion:gc(equipo, e => e.ubicacion|| 'Sin ubicación'),
    bySegmento: gc(equipo, e => e.segmentoAntiguedad ? labelSegmento(e.segmentoAntiguedad) : 'Sin datos'),
    antiguedadPromDias,
    pctPerfilesNuevos,
    perfilesNuevos,
  }
}
export function calcPerformancePorSegmento(finalizadas, auditados, historico, equipoMap, dimension) {
  const FUERA = 'Fuera de padrón actual'
  if (!historico?.length) return []
  const prodMap = new Map()
  for (const r of historico) {
    const eq = equipoMap?.get(r.usuario)
    const seg = eq ? (eq[dimension] ?? FUERA) : FUERA
    const key = String(seg)
    if (!prodMap.has(key)) prodMap.set(key, { segmento: key, totalTareas: 0, totalIds: 0, diasSet: new Set(), usuarios: new Set() })
    const e = prodMap.get(key)
    e.totalTareas += 1
    e.totalIds    += r.idsTC ?? 1
    if (r.fechaKey) e.diasSet.add(r.fechaKey)
    e.usuarios.add(r.usuario)
  }
  const calMap = new Map()
  for (const r of (auditados||[])) {
    const eq = equipoMap?.get(r.usuario)
    const seg = String(eq ? (eq[dimension] ?? FUERA) : FUERA)
    if (!calMap.has(seg)) calMap.set(seg, { total: 0, correcto: 0 })
    calMap.get(seg).total++
    if (r.calidad === 'correcto') calMap.get(seg).correcto++
  }
  const holdMap = new Map()
  for (const r of (historico||[]).filter(r=>r.status==='HOLD')) {
    const eq = equipoMap?.get(r.usuario)
    const seg = String(eq ? (eq[dimension] ?? FUERA) : FUERA)
    holdMap.set(seg, (holdMap.get(seg)||0)+1)
  }
  return Array.from(prodMap.values()).map(e => {
    const dias = e.diasSet.size
    const cal = calMap.get(e.segmento)||{total:0,correcto:0}
    const holdRegs = holdMap.get(e.segmento)||0
    return { segmento: e.segmento, totalTareas: e.totalTareas, totalIds: e.totalIds, promDia: dias>0?Math.round(e.totalTareas/dias):0, colaboradores: e.usuarios.size, efectividadSug: cal.total>0?cal.correcto/cal.total:null, auditadas: cal.total, holdRegistros: holdRegs, holdRelativo: e.totalTareas>0?holdRegs/e.totalTareas:null }
  }).sort((a,b)=>b.totalTareas-a.totalTareas)
}
