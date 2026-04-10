/**
 * DATASET JOINERS
 * Enriquece datasets operativos con datos de equipo (join por usuario/ID_MELI)
 */

/**
 * Construye un mapa rápido de equipo por idMeli
 */
export function buildEquipoMap(equipo) {
  const map = new Map()
  for (const e of (equipo || [])) {
    if (e.idMeli) map.set(e.idMeli, e)
  }
  return map
}

/**
 * Agrega campos de equipo a cualquier array con campo `usuario`
 * Si el usuario NO existe en equipoMap, lo marca como "Fuera de padrón actual"
 * en lugar de dejarlo con campos null (que aparecen como "—" mudos en tablas).
 */
export function joinWithEquipo(rows, equipoMap) {
  if (!equipoMap || equipoMap.size === 0) return rows
  return rows.map(r => {
    const eq = equipoMap.get(r.usuario)
    if (eq) {
      return {
        ...r,
        rol: eq.rol,
        equipo: eq.equipo,
        ubicacion: eq.ubicacion,
        extUser: eq.extUser,
        segmentoAntiguedad: eq.segmentoAntiguedad,
        antiguedadDias: eq.antiguedadDias,
        nombre: eq.nombre,
        fueraDepadron: false,
      }
    }
    // Usuario con actividad histórica pero fuera del padrón actual
    return {
      ...r,
      equipo:             r.equipo             ?? 'Fuera de padrón actual',
      rol:                r.rol                ?? 'No informado',
      ubicacion:          r.ubicacion          ?? 'No informada',
      segmentoAntiguedad: r.segmentoAntiguedad ?? 'Sin dato',
      fueraDepadron: true,
    }
  })
}
