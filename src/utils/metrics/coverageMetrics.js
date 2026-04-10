import { THRESHOLDS } from '../../config/thresholds.js'

// Fuente de referencia operativa: historico (ya no depende de finalizadas)
export function calcCoverage({ historico, auditados }) {
  const lastHist = maxFecha(historico)
  const lastAud  = maxFecha(auditados)
  const firstHist = minFecha(historico)
  const firstAud  = minFecha(auditados)
  const desfaseAudOp = lastHist && lastAud ? Math.abs(daysBetween(lastAud, lastHist)) : null
  const flags = []
  if (desfaseAudOp != null && desfaseAudOp > THRESHOLDS.coverage.desfaseMaxDias) {
    flags.push({ nivel: 'atencion', mensaje: `La auditoría tiene ${desfaseAudOp} días de desfase respecto del operativo. Interpretá la calidad con cautela.` })
  }
  if (firstHist && firstAud && Math.abs(daysBetween(firstAud, firstHist)) > 7) {
    flags.push({ nivel: 'contexto', mensaje: 'Los datasets tienen distintas fechas de inicio. Las comparaciones pueden no cubrir el mismo universo.' })
  }
  return {
    historico: { primera: firstHist, ultima: lastHist, filas: historico?.length ?? 0 },
    auditados: { primera: firstAud,  ultima: lastAud,  filas: auditados?.length ?? 0 },
    desfaseAudOp, flags, esParcial: flags.length > 0,
  }
}
const maxFecha = arr => { if (!arr?.length) return null; let m = null; for (const r of arr) if (r.fecha && (!m || r.fecha > m)) m = r.fecha; return m }
const minFecha = arr => { if (!arr?.length) return null; let m = null; for (const r of arr) if (r.fecha && (!m || r.fecha < m)) m = r.fecha; return m }
const daysBetween = (a, b) => (!a || !b) ? null : Math.round((b - a) / (1000 * 60 * 60 * 24))
