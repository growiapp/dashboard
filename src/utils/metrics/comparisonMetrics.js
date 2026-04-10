export function buildPeriodos(rawData, filters) {
  const { fechaDesde, fechaHasta } = filters
  if (!fechaDesde && !fechaHasta) return { hasPrev: false }
  const desde = fechaDesde || new Date(0)
  const hasta = fechaHasta || new Date()
  const durMs = hasta - desde
  const prevHasta = new Date(desde.getTime() - 1)
  const prevDesde = new Date(prevHasta.getTime() - durMs)
  const fp = arr => (arr || []).filter(r => r.fecha && r.fecha >= prevDesde && r.fecha <= prevHasta)
  return { hasPrev: true, prevDesde, prevHasta, prevFinalizadas: fp(rawData.finalizadas), prevHistorico: fp(rawData.historico), prevAuditados: fp(rawData.auditados) }
}
export function delta(actual, anterior) {
  if (anterior == null || anterior === 0 || actual == null) return null
  return (actual - anterior) / Math.abs(anterior)
}
export function deltaLabel(d) {
  if (d == null) return null
  const pct = Math.round(Math.abs(d) * 100)
  return d >= 0 ? `+${pct}%` : `-${pct}%`
}
export function deltaColor(d, inverso = false) {
  if (d == null) return 'var(--text3)'
  const positivo = inverso ? d < 0 : d > 0
  if (Math.abs(d) < 0.03) return 'var(--text3)'
  return positivo ? 'var(--green)' : 'var(--red)'
}
