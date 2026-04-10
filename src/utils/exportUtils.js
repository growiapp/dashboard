import JSZip from 'jszip'

export function toCSV(rows) {
  if (!rows?.length) return ''
  const headers = Object.keys(rows[0])
  const escape = v => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(','))
  ].join('\n')
}

export function downloadCSV(rows, filename) {
  const csv = toCSV(rows)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export async function downloadZIP(files, zipName) {
  const zip = new JSZip()
  for (const { name, rows } of files) {
    if (rows?.length) zip.file(name, '\uFEFF' + toCSV(rows))
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = zipName; a.click()
  URL.revokeObjectURL(url)
}

export function formatProductividadColab(ranking) {
  return (ranking || []).map(r => ({
    'Colaborador':        r.usuario,
    'Tareas':             r.totalTareas,
    'IDs trabajados':     r.totalIds,
    'IDs por tarea':      r.relIdsPorTarea,
    'Días activos':       r.diasHabiles,
    'Tareas por día':     r.promTareasPorDia,
    'Equipo':             r.equipo || '',
    'Rol':                r.rol || '',
    'Ubicación':          r.ubicacion || '',
  }))
}

export function formatCalidadColab(porUsuario) {
  return (porUsuario || []).map(r => ({
    'Colaborador':            r.usuario,
    'Sugerencias auditadas':  r.totalSugs,
    'Efectividad sugerencia': `${Math.round(r.efectividadSug * 100)}%`,
    'Correctas':              r.correcto || 0,
    'Desvío leve':            r.desvio_leve || 0,
    'Desvío grave':           r.desvio_grave || 0,
    'Casos auditados':        r.totalCasos || 0,
    'Efectividad caso':       `${Math.round(r.efectividadCaso * 100)}%`,
  }))
}

export function formatCalidadError(porError) {
  return (porError || []).map(r => ({
    'Código de error':  r.error,
    'Total':            r.total,
    'Correctas':        r.correcto || 0,
    'Desvío leve':      r.desvio_leve || 0,
    'Desvío grave':     r.desvio_grave || 0,
    'Efectividad':      `${Math.round(r.efectividad * 100)}%`,
  }))
}

export function formatCalidadAuditor(porAuditor) {
  return (porAuditor || []).map(r => ({
    'Auditor':           r.auditor,
    'Sugerencias':       r.total,
    'Correctas':         r.correcto || 0,
    'Desvío leve':       r.desvio_leve || 0,
    'Desvío grave':      r.desvio_grave || 0,
    'Efectividad':       r.total > 0 ? `${Math.round((r.correcto||0)/r.total*100)}%` : '—',
  }))
}

export function formatEquipoPerformance(perfData, dim) {
  return (perfData || []).map(r => ({
    'Segmento':           r.segmento,
    'Colaboradores':      r.colaboradores,
    'Tareas':             r.totalTareas,
    'IDs trabajados':     r.totalIds,
    'Tareas por día':     r.promDia,
    'Efectividad calidad': r.efectividadSug != null ? `${Math.round(r.efectividadSug*100)}%` : '',
    'Auditadas':          r.auditadas,
    '% en espera (HOLD)': r.holdRelativo != null ? `${Math.round(r.holdRelativo*100)}%` : '',
  }))
}

export function formatEquipoDirectorio(equipo) {
  return (equipo || []).map(e => ({
    'ID':         e.idMeli,
    'Nombre':     e.nombre || '',
    'Rol':        e.rol || '',
    'Equipo':     e.equipo || '',
    'Ubicación':  e.ubicacion || '',
    'Antigüedad (días)': e.antiguedadDias ?? '',
    'Segmento':   e.segmentoAntiguedad || '',
  }))
}

export function formatHoldHistorico(byUsuario, totalRegistros) {
  return (byUsuario || []).map(r => ({
    'Colaborador':        r.usuario,
    'Registros HOLD':     r.total,
    '% del total':        totalRegistros > 0 ? `${Math.round(r.total/totalRegistros*100)}%` : '0%',
  }))
}

export function formatHoldSnapshot(snapshotEnriquecido) {
  return (snapshotEnriquecido || []).map(r => {
    const idText = r.idLink
      ? (r.idLink.split('/').filter(Boolean).pop() || r.idLink)
      : (r.id || '')
    return {
      'Colaborador':    r.usuario,
      'Equipo':         r.equipoNombre || '',
      'Flujo':          r.flujo || '',
      'ID':             idText,
      'Motivo':         r.incidencia || '',
      'IDs trabajados': r.idsTC || '',
      'Días en HOLD':   r.diasEnHold ?? '',
      'Comentarios':    r.comentarios || '',
    }
  })
}

export function formatFriccionColab(byUsuario, totalRegistros) {
  return (byUsuario || []).map(r => ({
    'Colaborador':        r.usuario,
    'Registros HOLD':     r.total,
    '% del total':        totalRegistros > 0 ? `${Math.round(r.total/totalRegistros*100)}%` : '0%',
  }))
}

export function formatCalidadMao(auditadosMao) {
  return (auditadosMao || []).map(r => ({
    'Fecha':                r.fecha ? r.fecha.toLocaleDateString('es-AR') : '',
    'Colaborador':          r.usuario,
    'Auditor':              r.auditor || '',
    'Dominio':              r.dominio || '',
    'Resolución':           r.resolucion || '',
    'Estado final OK':      r.estadoFinal || '',
    'Motivo rechazo OK':    r.motivoRechazo || '',
    'Calidad':              r.calidad || '',
    'Comentario':           r.comentario || '',
    'Equipo':               r.equipo || '',
    'Rol':                  r.rol || '',
  }))
}
