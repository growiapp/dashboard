/**
 * FILTERS BAR v4
 * - Período: Todo el período / Esta semana / Últimas 2 semanas / Último mes / Personalizado
 * - Fechas custom: solo visibles cuando preset === 'personalizado'
 * - Segmentar: flujo, equipo, rol, ubicación (sin colaboradores, antigüedad, tipo)
 * - Panel avanzado de Calidad colapsable
 * - Chips removibles
 */
import { useState } from 'react'
import { PRESETS } from '../hooks/useGlobalFilters.js'
import { COPY } from '../config/copy.js'

export function FiltersBar({
  filters, options, setFilter, resetFilters,
  calFilters, setCalFilter, resetCalFilters,
  allChips, activeCount, activeTab,
}) {
  const [advOpen, setAdvOpen] = useState(false)
  const isCalidad = activeTab === 'calidad'
  const hasCalChips = allChips.some(c => c.contextual)
  const isCustom = filters.preset === 'custom'

  return (
    <div className="filters-wrap">
      {/* Fila principal */}
      <div className="filters-bar">
        {/* ── Período ── */}
        <span className="filter-group-label">Período</span>
        <div className="filter-preset-group">
          {PRESETS.map(p => (
            <button
              key={p.id}
              className={`filter-preset-btn${filters.preset === p.id ? ' active' : ''}`}
              onClick={() => setFilter('preset', p.id)}
            >{p.label}</button>
          ))}
        </div>

        {/* Fechas custom — solo visibles en modo Personalizado */}
        {isCustom && (
          <>
            <input type="date" className="filter-date" title={COPY.filtros.fechaDesde}
              value={filters.fechaDesde ? toInputDate(filters.fechaDesde) : ''}
              onChange={e => setFilter('fechaDesde', e.target.value ? new Date(e.target.value+'T00:00:00') : null)} />
            <span className="filter-date-sep">→</span>
            <input type="date" className="filter-date" title={COPY.filtros.fechaHasta}
              value={filters.fechaHasta ? toInputDate(filters.fechaHasta) : ''}
              onChange={e => setFilter('fechaHasta', e.target.value ? new Date(e.target.value+'T23:59:59') : null)} />
          </>
        )}

        {/* ── Segmentación ── */}
        <Div />
        <span className="filter-group-label">Segmentar</span>

        <Sel value={filters.flujo||''} onChange={v=>setFilter('flujo',v||null)}
          label={COPY.filtros.flujo} placeholder={COPY.placeholder.flujo}
          opts={options.flujos||[]} />

        <Sel value={filters.equipo||''} onChange={v=>setFilter('equipo',v||null)}
          label={COPY.filtros.equipo} placeholder={COPY.placeholder.equipo}
          opts={options.equipos||[]} />

        <Sel value={filters.rol||''} onChange={v=>setFilter('rol',v||null)}
          label={COPY.filtros.rol} placeholder={COPY.placeholder.rol}
          opts={options.roles||[]} />

        <Sel value={filters.ubicacion||''} onChange={v=>setFilter('ubicacion',v||null)}
          label={COPY.filtros.ubicacion} placeholder={COPY.placeholder.ubicacion}
          opts={options.ubicaciones||[]} />

        {/* Panel avanzado de Calidad */}
        {isCalidad && (
          <>
            <Div />
            <button
              className={`filter-advanced-btn${advOpen?' active':''}${hasCalChips?' has-active':''}`}
              onClick={() => setAdvOpen(o=>!o)}
            >
              Calidad {hasCalChips && <span className="filter-advanced-dot"/>}
              <span className="filter-advanced-caret">{advOpen?'▴':'▾'}</span>
            </button>
          </>
        )}

        {activeCount > 0 && (
          <>
            <Div />
            <button className="filter-reset" onClick={resetFilters} title="Quitar todos los filtros">✕ Limpiar</button>
          </>
        )}
      </div>

      {/* Panel contextual de Calidad */}
      {isCalidad && advOpen && (
        <div className="filters-advanced-panel">
          <span className="filter-label">Solo en Calidad:</span>
          <Sel value={calFilters.auditor||''} onChange={v=>setCalFilter('auditor',v||null)}
            label={COPY.filtros.auditor} placeholder={COPY.placeholder.auditor}
            opts={options.auditores||[]} />
          <Sel value={calFilters.dominio||''} onChange={v=>setCalFilter('dominio',v||null)}
            label={COPY.filtros.dominio} placeholder={COPY.placeholder.dominio}
            opts={options.dominios||[]} />
          <Sel value={calFilters.suggestionReason||''} onChange={v=>setCalFilter('suggestionReason',v||null)}
            label={COPY.filtros.suggestionReason} placeholder={COPY.placeholder.suggestionReason}
            opts={options.suggestionReasons||[]} />
          <Sel value={calFilters.calidad||''} onChange={v=>setCalFilter('calidad',v||null)}
            label={COPY.filtros.calidad} placeholder={COPY.placeholder.calidad}
            opts={[
              {value:'correcto',label:'Correcto',count:null},
              {value:'desvio_leve',label:'Desvío leve',count:null},
              {value:'desvio_grave',label:'Desvío grave',count:null},
              {value:'sin_clasificar',label:'Sin clasificar',count:null},
            ]} />
          {hasCalChips && (
            <button className="filter-reset" style={{marginLeft:'auto'}} onClick={resetCalFilters}>
              ✕ Limpiar filtros de Calidad
            </button>
          )}
        </div>
      )}

      {/* Chips */}
      {allChips.length > 0 && (
        <div className="filters-chips">
          {allChips.map(chip => (
            <button
              key={chip.key}
              className={`filter-chip${chip.contextual?' contextual':''}`}
              onClick={() => chip.contextual ? setCalFilter(chip.key, null) : setFilter(chip.key, null)}
              title={`Quitar filtro: ${chip.label}`}
            >
              <span className="filter-chip-label">{chip.label}:</span>
              <span className="filter-chip-value">{chip.value}</span>
              <span className="filter-chip-remove">✕</span>
            </button>
          ))}
          {allChips.length > 1 && (
            <button className="filter-chip filter-chip-clear" onClick={() => { resetFilters(); resetCalFilters(); }}>
              Quitar todos
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Sel({ value, onChange, label, placeholder, opts }) {
  return (
    <select className="filter-select" value={value}
      onChange={e=>onChange(e.target.value||null)} title={label} aria-label={label}>
      <option value="">{placeholder}</option>
      {opts.map(o => (
        <option key={o.value} value={String(o.value)}>
          {o.label}{o.count!=null&&o.count>0?` (${o.count.toLocaleString('es-AR')})` :''}
        </option>
      ))}
    </select>
  )
}
function Div() {
  return <div style={{width:1,height:20,background:'var(--border)',margin:'0 4px',flexShrink:0}} />
}
function toInputDate(d) {
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
