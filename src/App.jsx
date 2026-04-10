import { useState, useMemo } from 'react'
import { useDataLoader } from './hooks/useDataLoader.js'
import { useGlobalFilters, PRESETS } from './hooks/useGlobalFilters.js'
import { useCalidadFilters } from './hooks/useCalidadFilters.js'
import { useDashboardModel } from './hooks/useDashboardModel.js'
import { FiltersBar } from './components/FiltersBar.jsx'
import { ExecutiveModule } from './modules/ExecutiveModule.jsx'
import { ProductividadModule } from './modules/ProductividadModule.jsx'
import { CalidadModule } from './modules/CalidadModule.jsx'
import { FriccionModule } from './modules/FriccionModule.jsx'
import { EquipoModule } from './modules/EquipoModule.jsx'
import { IndividualModule } from './modules/IndividualModule.jsx'
import { Spinner } from './components/ui/index.jsx'
import { APP_CONFIG } from './config/datasources.js'
import { joinWithEquipo, buildEquipoMap } from './utils/selectors/datasetJoiners.js'
import { readFromURL, writeToURL } from './utils/selectors/queryState.js'
import { COPY } from './config/copy.js'
import {
  downloadZIP,
  formatProductividadColab, formatCalidadColab, formatCalidadError,
  formatCalidadAuditor, formatEquipoPerformance, formatEquipoDirectorio,
  formatHoldHistorico, formatHoldSnapshot, formatCalidadMao,
} from './utils/exportUtils.js'

const TABS = [
  { id: 'resumen',       label: 'Resumen' },
  { id: 'productividad', label: 'Productividad' },
  { id: 'calidad',       label: 'Calidad' },
  { id: 'friccion',      label: 'Fricción' },
  { id: 'equipo',        label: 'Equipo' },
  { id: 'individual',    label: 'Personas' },
]

// Formato: "Jueves 2 de abril de 2026 · 22:38" — hora de Buenos Aires
function formatDatetimeBsAs(date) {
  if (!date) return null
  const opts = { timeZone: 'America/Argentina/Buenos_Aires' }
  const weekday = date.toLocaleDateString('es-AR', { ...opts, weekday: 'long' })
  const day     = date.toLocaleDateString('es-AR', { ...opts, day: 'numeric' })
  const month   = date.toLocaleDateString('es-AR', { ...opts, month: 'long' })
  const year    = date.toLocaleDateString('es-AR', { ...opts, year: 'numeric' })
  const time    = date.toLocaleTimeString('es-AR', { ...opts, hour: '2-digit', minute: '2-digit', hour12: false })
  // Capitalizar weekday y month
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1)
  return `${cap(weekday)} ${day} de ${month} de ${year} · ${time}`
}

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const t = readFromURL().tab
    return TABS.find(tab => tab.id === t)?.id || 'resumen'
  })

  const { historico, finalizadas, auditados, hold, equipo, auditados_mao, loading, errors, loadedAt, reload } = useDataLoader()

  const equipoMap  = useMemo(() => buildEquipoMap(equipo), [equipo])
  const joinedData = useMemo(() => ({
    historico:   joinWithEquipo(historico   || [], equipoMap),
    finalizadas: joinWithEquipo(finalizadas || [], equipoMap),
    auditados:   joinWithEquipo(auditados   || [], equipoMap),
    auditados_mao: joinWithEquipo(auditados_mao || [], equipoMap),
    hold: hold || [],
  }), [historico, finalizadas, auditados, auditados_mao, hold, equipoMap])

  const { filters, filtered, options, setFilter, resetFilters, activeChips, activeCount } =
    useGlobalFilters(joinedData)

  const { calFilters, setCalFilter, resetCalFilters, auditadosFiltrados, calChips, activeCalCount } =
    useCalidadFilters(filtered)

  const filteredWithCal = useMemo(() => ({ ...filtered, auditados: auditadosFiltrados }), [filtered, auditadosFiltrados])

  // MAO: aplicar mismo filtrado global (fecha, usuario, equipo, rol, etc.)
  const auditadosMaoFiltrados = useMemo(() => {
    const mao = joinedData.auditados_mao || []
    return mao.filter(r => {
      if (filters.fechaDesde && r.fecha < filters.fechaDesde) return false
      if (filters.fechaHasta && r.fecha > filters.fechaHasta) return false
      if (filters.usuario && r.usuario !== filters.usuario) return false
      if (filters.equipo  && r.equipo  !== filters.equipo)  return false
      if (filters.rol     && r.rol     !== filters.rol)     return false
      return true
    })
  }, [joinedData.auditados_mao, filters])
  const rawData = { historico: historico||[], finalizadas: finalizadas||[], auditados: auditados||[], auditados_mao: auditados_mao||[], hold: hold||[] }

  const model = useDashboardModel({
    rawData, filtered: filteredWithCal, filters,
    equipo: equipo||[], holdLoadedAt: loadedAt,
  })

  function navigateTo(tabId, extraFilters) {
    if (extraFilters) for (const [k, v] of Object.entries(extraFilters)) setFilter(k, v)
    setActiveTab(tabId)
    writeToURL({ tab: tabId })
  }
  function handleTabChange(tabId) { setActiveTab(tabId); writeToURL({ tab: tabId }) }

  async function handleExportAll() {
    const { prodModel, calidadModel, friccionModel, equipoModel, filteredHistorico } = model
    const snap = filtered.hold || []

    // Enriquecer snapshot con días en HOLD (mismo cálculo que FriccionModule)
    const primerHoldMap = new Map()
    for (const r of (filteredHistorico || [])) {
      if (r.status !== 'HOLD' || !r.idLink || !r.usuario) continue
      const key = `${r.usuario}||${r.idLink}`
      const prev = primerHoldMap.get(key)
      if (!prev || r.fecha < prev) primerHoldMap.set(key, r.fecha)
    }
    const hoy = new Date()
    const snapEnriquecido = snap.map(r => {
      const eq = model.equipoMap?.get(r.usuario)
      const key = `${r.usuario}||${r.idLink}`
      const pf = primerHoldMap.get(key)
      return {
        ...r,
        equipoNombre: eq?.equipo ?? 'Fuera de padrón actual',
        diasEnHold: pf ? Math.max(0, Math.floor((hoy - pf) / 86400000)) : null,
      }
    })

    const totalHold = friccionModel?.kpisHold?.totalRegistros || 0
    const byUsuarioHold = Object.entries(friccionModel?.kpisHold?.byUsuario || {})
      .map(([usuario, total]) => ({ usuario, total }))

    const date = new Date().toISOString().slice(0, 10)
    await downloadZIP([
      { name: 'productividad_colaboradores.csv',  rows: formatProductividadColab(prodModel?.ranking) },
      { name: 'calidad_por_colaborador.csv',       rows: formatCalidadColab(calidadModel?.porUsuario) },
      { name: 'calidad_por_error.csv',             rows: formatCalidadError(calidadModel?.porError) },
      { name: 'calidad_por_auditor.csv',           rows: formatCalidadAuditor(calidadModel?.porAuditor) },
      { name: 'equipo_performance.csv',            rows: formatEquipoPerformance(equipoModel?.porEquipo) },
      { name: 'equipo_directorio.csv',             rows: formatEquipoDirectorio(equipo || []) },
      { name: 'hold_historico_colaboradores.csv',  rows: formatHoldHistorico(byUsuarioHold, totalHold) },
      { name: 'calidad_mao.csv',                  rows: formatCalidadMao(auditadosMaoFiltrados) },
      { name: 'hold_snapshot_activo.csv',          rows: formatHoldSnapshot(snapEnriquecido) },
    ], `catalogo_dashboard_${date}.zip`)
  }

  const errorEntries = Object.entries(errors)
  const hasPartial   = errorEntries.length > 0 && !loading && (historico?.length)
  const allChips     = [...activeChips, ...calChips]
  const datetimeLabel = formatDatetimeBsAs(loadedAt)

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <svg className="header-logo" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="#6366f1"/>
            <rect x="6" y="8" width="6" height="6" rx="1" fill="white" opacity="0.9"/>
            <rect x="16" y="8" width="6" height="6" rx="1" fill="white" opacity="0.7"/>
            <rect x="6" y="16" width="6" height="6" rx="1" fill="white" opacity="0.7"/>
            <rect x="16" y="16" width="6" height="6" rx="1" fill="white" opacity="0.5"/>
          </svg>
          <div>
            <div className="header-title">{APP_CONFIG.title}</div>
            <div className="header-sub">{APP_CONFIG.subtitle}</div>
          </div>
        </div>
        <div className="header-right">
          {datetimeLabel && (
            <span className="badge badge-slate datetime-pill" title="Última carga de datos">
              {datetimeLabel}
            </span>
          )}
          {activeCount + activeCalCount > 0 && (
            <span className="badge badge-accent">
              {activeCount + activeCalCount} {activeCount + activeCalCount === 1 ? 'filtro' : 'filtros'}
            </span>
          )}
          <button className="btn" onClick={handleExportAll} title="Descargar todos los datos del período filtrado como ZIP">⬇ Exportar todo</button>
          <button className="btn" onClick={reload}>↻ Actualizar</button>
        </div>
      </header>

      <nav className="nav">
        {TABS.map(tab => (
          <button key={tab.id}
            className={`nav-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => handleTabChange(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>

      <FiltersBar
        filters={filters} options={options}
        setFilter={setFilter} resetFilters={resetFilters}
        calFilters={calFilters} setCalFilter={setCalFilter}
        resetCalFilters={resetCalFilters}
        allChips={allChips} activeCount={activeCount + activeCalCount}
        activeTab={activeTab}
      />

      <main className="main">
        {!loading && errorEntries.filter(([k]) => k !== 'equipo').length > 0 && (
          <div className="state-banner state-banner-error">
            {COPY.errorCarga}
            <button className="btn" style={{ marginLeft: '0.75rem' }} onClick={reload}>Recargar</button>
          </div>
        )}

        {loading ? <Spinner label={COPY.loading}/> : (
          <>
            {activeTab === 'resumen'       && <ExecutiveModule model={model} navigateTo={navigateTo} holdLoadedAt={loadedAt}/>}
            {activeTab === 'productividad' && <ProductividadModule model={model}/>}
            {activeTab === 'calidad'       && <CalidadModule model={model} auditados={filteredWithCal.auditados} auditadosMao={auditadosMaoFiltrados}/>}
            {activeTab === 'friccion'      && <FriccionModule model={model} holdSnapshot={hold||[]} holdLoadedAt={loadedAt} historicoCompleto={historico||[]} filters={filters}/>}
            {activeTab === 'equipo'        && <EquipoModule model={model} equipo={equipo||[]} equipoError={errors?.equipo} navigateTo={navigateTo} setFilter={setFilter}/>}
            {activeTab === 'individual'    && <IndividualModule model={model} equipo={equipo||[]} options={options}/>}
          </>
        )}
      </main>
    </div>
  )
}
