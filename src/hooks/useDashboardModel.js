import { useMemo } from 'react'
import {
  calcProductividadKPIs, agruparPorSemana,
  rankingColaboradores, top5Bottom5, complejidadPorFlujo,
} from '../utils/metrics/productividadMetrics.js'
import {
  calcCalidadKPIs, calidadPorUsuario, calidadPorAuditor,
  calidadPorDominio, calidadPorError, calidadPorSemana, concentracionDesvios,
} from '../utils/metrics/calidadMetrics.js'
import {
  calcHoldKPIs, calcHoldLeadTime, holdPorSemana, calcSnapshotHold,
} from '../utils/metrics/friccionMetrics.js'
import { buildPeriodos } from '../utils/metrics/comparisonMetrics.js'
import { calcCoverage } from '../utils/metrics/coverageMetrics.js'
import { calcComposicion, calcPerformancePorSegmento } from '../utils/metrics/equipoMetrics.js'
import { generarInsights } from '../utils/metrics/insightEngine.js'
import { buildEquipoMap } from '../utils/selectors/datasetJoiners.js'

export function useDashboardModel({ rawData, filtered, filters, equipo, holdLoadedAt }) {
  const equipoMap = useMemo(() => buildEquipoMap(equipo), [equipo])
  const periodos  = useMemo(() => buildPeriodos(rawData, filters), [rawData, filters.fechaDesde, filters.fechaHasta])
  const coverage  = useMemo(() => calcCoverage(filtered), [filtered.historico, filtered.auditados])

    const prodModel = useMemo(() => {
    const hist = filtered.historico
    if (!hist?.length) return null

    const kpis    = calcProductividadKPIs(hist)
    // Semanas: tareas e IDs desde historico — fuente única por regla de negocio
    const semanas = agruparPorSemana(hist)

    const ranking          = rankingColaboradores(hist)
    const { top5, bottom5 } = top5Bottom5(ranking)
    const complejidadFlujo = complejidadPorFlujo(hist)
    const colabActivos     = ranking.length
    const promDiasActivos  = ranking.length > 0
      ? Math.round(ranking.reduce((s, r) => s + r.diasHabiles, 0) / ranking.length) : 0

    let prevKpis = null
    if (periodos.hasPrev && periodos.prevHistorico?.length)
      prevKpis = calcProductividadKPIs(periodos.prevHistorico)

    return { kpis, semanas, ranking, top5, bottom5, complejidadFlujo, colabActivos, promDiasActivos, prevKpis }
  }, [filtered.historico, periodos])

    const calidadModel = useMemo(() => {
    const aud = filtered.auditados
    if (!aud?.length) return null
    const kpis          = calcCalidadKPIs(aud)
    const porSemana     = calidadPorSemana(aud)
    const porUsuario    = calidadPorUsuario(aud)
    const porAuditor    = calidadPorAuditor(aud)
    const porDominio    = calidadPorDominio(aud)
    const porError      = calidadPorError(aud)
    const concentracion = concentracionDesvios(aud)
    let prevKpis = null
    if (periodos.hasPrev && periodos.prevAuditados?.length)
      prevKpis = calcCalidadKPIs(periodos.prevAuditados)
    return { kpis, porSemana, porUsuario, porAuditor, porDominio, porError, concentracion, prevKpis }
  }, [filtered.auditados, periodos])

    const friccionModel = useMemo(() => {
    const hist = filtered.historico
    if (!hist?.length) return null
    const kpisHold = calcHoldKPIs(hist)
    const leadTime = calcHoldLeadTime(hist)
    const holdSem  = holdPorSemana(hist)
    const snapshot = calcSnapshotHold(filtered.hold || [], holdLoadedAt)
    return { kpisHold, leadTime, holdSem, snapshot }
  }, [filtered.historico, filtered.hold, holdLoadedAt])

    const equipoModel = useMemo(() => {
    if (!equipo?.length) return null
    const composicion   = calcComposicion(equipo)
    const aud = filtered.auditados
    const hist = filtered.historico
    const porEquipo    = calcPerformancePorSegmento(null, aud, hist, equipoMap, 'equipo')
    const porRol       = calcPerformancePorSegmento(null, aud, hist, equipoMap, 'rol')
    const porUbicacion = calcPerformancePorSegmento(null, aud, hist, equipoMap, 'ubicacion')
    const porSegmento  = calcPerformancePorSegmento(null, aud, hist, equipoMap, 'segmentoAntiguedad')
    const porExtUser   = null // eliminado: distinción ext/int removida
    return { composicion, porEquipo, porRol, porUbicacion, porSegmento }
  }, [equipo, equipoMap, filtered.auditados, filtered.historico])

    const insights = useMemo(() => generarInsights({
    kpisProd:       prodModel?.kpis,
    kpisCalidad:    calidadModel?.kpis,
    kpisHold:       friccionModel?.kpisHold,
    snapshot:       friccionModel?.snapshot,
    leadTime:       friccionModel?.leadTime,
    prevKpisProd:   prodModel?.prevKpis,
    prevKpisCalidad: calidadModel?.prevKpis,
    semanas:        prodModel?.semanas,
    rankColab:      prodModel?.ranking,
    porDominio:     calidadModel?.porDominio,
    porError:       calidadModel?.porError,
    // Excluir "Fuera de padrón actual" de toda la capa de decisión de insights
    equipoPerf:     (equipoModel?.porEquipo || []).filter(s => s.segmento !== 'Fuera de padrón actual'),
    coverage,
  }), [prodModel, calidadModel, friccionModel, equipoModel, coverage])

  return { prodModel, calidadModel, friccionModel, equipoModel, coverage, insights, periodos, equipoMap, filteredHistorico: filtered?.historico || [] }
}
