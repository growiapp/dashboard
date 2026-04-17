import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatNumber } from '../utils/parsers.js'
import { CALIDAD_COLORS } from '../utils/normalizers.js'
import { THRESHOLDS } from '../config/thresholds.js'
import { COPY } from '../config/copy.js'
import { labelSegmento } from '../config/segments.js'
import { EmptyState, CustomTooltip, ExportCSVButton } from '../components/ui/index.jsx'
import { useTableSort, SortTh } from '../hooks/useTableSort.jsx'
import { formatEquipoPerformance } from '../utils/exportUtils.js'

const DIM_OPTS = [
  { id: 'equipo',             label: 'Por equipo' },
  { id: 'rol',                label: 'Por rol' },
  { id: 'ubicacion',          label: 'Por ubicación' },
  { id: 'segmentoAntiguedad', label: 'Por antigüedad' },
]

function segLabel(dim, seg) {
  if (dim === 'segmentoAntiguedad') return labelSegmento(seg)
  return seg || '—'
}

function filterKey(dim) {
  if (dim === 'segmentoAntiguedad') return 'segAnti'
  return dim
}

// Coeficiente de variación (desviación estándar / media) — mide dispersión
function calcCV(values) {
  if (!values.length) return null
  const mean = values.reduce((s,v)=>s+v,0)/values.length
  if (mean === 0) return null
  const variance = values.reduce((s,v)=>s+(v-mean)**2,0)/values.length
  return Math.sqrt(variance)/mean
}

export function EquipoModule({ model, equipo, equipoError, navigateTo, setFilter }) {
  const [dim, setDim] = useState('equipo')
  const { equipoModel } = model

  if (!equipo?.length) {
    let msg = 'No hay datos de equipo cargados. Verificá que equipo_colaboradores.csv esté en /public/data/.'
    if (equipoError?.type === 'not_found') {
      msg = 'No se pudo cargar equipo_colaboradores.csv (archivo no encontrado)'
    } else if (equipoError?.type === 'parse_error') {
      msg = 'Error al procesar equipo_colaboradores.csv'
    } else if (equipoError?.type === 'empty') {
      msg = 'El archivo equipo_colaboradores.csv no contiene datos'
    }
    return <EmptyState message={msg} />
  }
  if (!equipoModel) {
    return <EmptyState message={COPY.empty} />
  }

  const { composicion, porEquipo, porRol, porUbicacion, porSegmento } = equipoModel

  const perfData = (dim==='equipo' ? porEquipo : dim==='rol' ? porRol
    : dim==='ubicacion' ? porUbicacion : porSegmento
  )?.filter(s => s.segmento !== 'Fuera de padrón actual')

  const { sorted: perfSorted, sortKey: perfSortKey, sortDir: perfSortDir, onSort: perfOnSort } = useTableSort(perfData, perfData)

    const dispersion = useMemo(() => {
    if (!perfData?.length) return null
    const conCalidad  = perfData.filter(s => s.efectividadSug != null && s.auditadas >= 3)
    const conProd     = perfData.filter(s => s.totalTareas > 0)
    const conFriccion = perfData.filter(s => s.holdRelativo != null)

    const efValues = conCalidad.map(s => s.efectividadSug)
    const prValues = conProd.map(s => s.totalTareas)
    const hrValues = conFriccion.map(s => s.holdRelativo)

    const sorted = [...conCalidad].sort((a,b)=>b.efectividadSug-a.efectividadSug)
    const brechaCalidad = sorted.length >= 2
      ? Math.round((sorted[0].efectividadSug - sorted[sorted.length-1].efectividadSug)*100)
      : null

    const sortedProd = [...conProd].sort((a,b)=>b.totalTareas-a.totalTareas)
    const topN = Math.max(1, Math.ceil(sortedProd.length * 0.2))
    const totalProd = sortedProd.reduce((s,r)=>s+r.totalTareas,0)
    const topProd   = sortedProd.slice(0,topN).reduce((s,r)=>s+r.totalTareas,0)
    const concentracionProd = totalProd > 0 ? Math.round(topProd/totalProd*100) : null

    return {
      brechaCalidad,
      cvCalidad:    efValues.length >= 2 ? Math.round(calcCV(efValues)*100) : null,
      cvProd:       prValues.length >= 2 ? Math.round(calcCV(prValues)*100) : null,
      concentracionProd,
      topNLabel:    `top ${topN} de ${sortedProd.length}`,
      mejorCalidad:  sorted[0]  ? segLabel(dim, sorted[0].segmento)  : null,
      peorCalidad:   sorted[sorted.length-1] ? segLabel(dim, sorted[sorted.length-1].segmento) : null,
    }
  }, [perfData, dim])

    const rankings = useMemo(() => {
    if (!perfData?.length) return null
    // Excluir "Fuera de padrón actual" del ranking — sus métricas se ven en otras tabs
    const activos = perfData.filter(s => s.segmento !== 'Fuera de padrón actual')
    const sorted  = [...activos].sort((a,b)=>b.totalTareas-a.totalTareas)
    const conEf   = activos.filter(s=>s.efectividadSug!=null&&s.auditadas>=3)
      .sort((a,b)=>b.efectividadSug-a.efectividadSug)
    const conHold = activos.filter(s=>s.holdRelativo!=null)
      .sort((a,b)=>b.holdRelativo-a.holdRelativo)

    // Solo mostrar bottom si no se solapa con top (hay suficientes segmentos distintos)
    const topN = 5
    const makeBottom = (arr) => {
      const top = arr.slice(0, topN)
      const bot = arr.slice(-topN).reverse()
      const topIds = new Set(top.map(r=>r.segmento))
      const botFiltrado = bot.filter(r => !topIds.has(r.segmento))
      return botFiltrado
    }

    return {
      topProd:    sorted.slice(0, topN),
      bottomProd: makeBottom(sorted),
      topCal:     conEf.slice(0, topN),
      bottomCal:  makeBottom(conEf),
      masHold:    conHold.slice(0, topN),
    }
  }, [perfData])

    const FUERA = 'Fuera de padrón actual'
  const riesgos = useMemo(() => {
    const r = []
    for (const seg of (porSegmento||[]).filter(s => s.segmento !== FUERA)) {
      if (seg.efectividadSug!=null && seg.efectividadSug<THRESHOLDS.calidad.efectividadSug.warn && seg.auditadas>=5)
        r.push({ nivel:'critico', texto:`Segmento "${labelSegmento(seg.segmento)}" tiene efectividad ${Math.round(seg.efectividadSug*100)}% — por debajo del target.`, drill:{ tab:'calidad', filter:{ segAnti:seg.segmento } } })
      if (seg.holdRelativo!=null && seg.holdRelativo>THRESHOLDS.friccion.holdRelativo.warn)
        r.push({ nivel:'atencion', texto:`Segmento "${labelSegmento(seg.segmento)}" tiene ${Math.round(seg.holdRelativo*100)}% de tareas en HOLD.`, drill:{ tab:'friccion', filter:{} } })
    }
    for (const eq of (porEquipo||[]).filter(e => e.segmento !== FUERA)) {
      if (eq.efectividadSug!=null && eq.efectividadSug<THRESHOLDS.calidad.efectividadSug.warn && eq.auditadas>=5)
        r.push({ nivel:'critico', texto:`Equipo "${eq.segmento}" tiene efectividad ${Math.round(eq.efectividadSug*100)}% — por debajo del target.`, drill:{ tab:'calidad', filter:{ equipo:eq.segmento } } })
    }
    return r.slice(0, 6)
  }, [porSegmento, porEquipo])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

      <div className="metric-note">{COPY.modules.equipoContexto}</div>

      {/* ── BLOQUE 1: Composición ─────────────────────────────── */}
      {composicion && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Composición del equipo</div>
              <div className="card-subtitle">Si la estructura cambia, también puede cambiar la operación.</div>
            </div>
          </div>
          <div className="grid grid-4" style={{ marginBottom:'1rem' }}>
            <StatBox label="Total colaboradores" value={composicion.total}
              sub={`${composicion.byEquipo.length} equipo${composicion.byEquipo.length!==1?'s':''} activos`} />
            <StatBox label="Antigüedad promedio"
              value={composicion.antiguedadPromDias != null
                ? composicion.antiguedadPromDias >= 365
                  ? `${(composicion.antiguedadPromDias/365).toFixed(1)} años`
                  : `${Math.round(composicion.antiguedadPromDias/30)} meses`
                : '—'}
              sub="Tiempo promedio en el equipo." />
            <StatBox label="Perfiles nuevos (< 3m)"
              value={composicion.pctPerfilesNuevos != null
                ? `${Math.round(composicion.pctPerfilesNuevos*100)}%`
                : '—'}
              sub="Con menos de 3 meses. Mayor riesgo de calidad." />
          </div>
          <div className="grid grid-2">
            <ComposicionList title="Por rol"    items={composicion.byRol}      total={composicion.total} />
            <ComposicionList title="Por equipo" items={composicion.byEquipo}   total={composicion.total} />
          </div>
          <div className="grid grid-2" style={{ marginTop:'0.75rem' }}>
            <ComposicionList title="Por ubicación"  items={composicion.byUbicacion} total={composicion.total} />
            <ComposicionList title="Por antigüedad" items={composicion.bySegmento}  total={composicion.total} />
          </div>
        </div>
      )}

      {/* ── BLOQUE 2: Performance con selector de dimensión ───── */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Rendimiento por segmento</div>
            <div className="card-subtitle">Comparás segmentos para detectar brechas reales. Si un grupo rinde distinto, hay que explicarlo.</div>
          </div>
          <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
            {DIM_OPTS.map(d => (
              <button key={d.id}
                className={`filter-preset-btn${dim===d.id?' active':''}`}
                onClick={() => setDim(d.id)}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {perfData?.length > 0 ? (
          <>
            {/* ── Métricas de dispersión ── */}
            {dispersion && (
              <div className="grid grid-4" style={{ marginBottom:'1rem' }}>
                {dispersion.brechaCalidad != null && (
                  <StatBox
                    label="Brecha de calidad"
                    value={`${dispersion.brechaCalidad} pp`}
                    sub={`Entre "${dispersion.mejorCalidad}" y "${dispersion.peorCalidad}"`}
                    color={dispersion.brechaCalidad > 15 ? 'var(--yellow)' : 'var(--text)'}
                  />
                )}
                {dispersion.cvCalidad != null && (
                  <StatBox
                    label="Dispersión de calidad"
                    value={`${dispersion.cvCalidad}%`}
                    sub="Cuánto varía la efectividad entre segmentos. Más alto = más desigualdad."
                    color={dispersion.cvCalidad > 20 ? 'var(--yellow)' : 'var(--text)'}
                  />
                )}
                {dispersion.concentracionProd != null && (
                  <StatBox
                    label="Concentración de producción"
                    value={`${dispersion.concentracionProd}%`}
                    sub={`El ${dispersion.topNLabel} explica este % del volumen total.`}
                    color={dispersion.concentracionProd > 70 ? 'var(--yellow)' : 'var(--text)'}
                  />
                )}
                {dispersion.cvProd != null && (
                  <StatBox
                    label="Dispersión de producción"
                    value={`${dispersion.cvProd}%`}
                    sub="Cuánto varía el volumen entre segmentos."
                    color={dispersion.cvProd > 50 ? 'var(--yellow)' : 'var(--text)'}
                  />
                )}
              </div>
            )}

            {/* ── Tabla completa ── */}
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'0.5rem' }}>
              <ExportCSVButton data={formatEquipoPerformance(perfSorted)} filename="equipo_performance.csv" />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <SortTh colKey="segmento"       label="Segmento"      sortKey={perfSortKey} sortDir={perfSortDir} onSort={perfOnSort} />
                    <SortTh colKey="colaboradores"  label="Colaboradores" sortKey={perfSortKey} sortDir={perfSortDir} onSort={perfOnSort} />
                    <SortTh colKey="totalTareas"    label="Tareas"        sortKey={perfSortKey} sortDir={perfSortDir} onSort={perfOnSort} title="Tareas" />
                    <SortTh colKey="totalIds"       label="IDs"           sortKey={perfSortKey} sortDir={perfSortDir} onSort={perfOnSort} title="IDs trabajados" />
                    <SortTh colKey="promDia"        label="Tareas/día"    sortKey={perfSortKey} sortDir={perfSortDir} onSort={perfOnSort} />
                    <SortTh colKey="efectividadSug" label="Calidad sug. ⓘ" sortKey={perfSortKey} sortDir={perfSortDir} onSort={perfOnSort} title="Sugerencias correctas (principal)" />
                    <SortTh colKey="auditadas"      label="Auditadas"     sortKey={perfSortKey} sortDir={perfSortDir} onSort={perfOnSort} />
                    <SortTh colKey="holdRelativo"   label="% en espera"   sortKey={perfSortKey} sortDir={perfSortDir} onSort={perfOnSort} title="IDs únicos en HOLD / total tareas" />
                    <th>Ir a →</th>
                  </tr>
                </thead>
                <tbody>
                  {perfSorted.map((r, i) => {
                    const label = segLabel(dim, r.segmento)
                    const fk    = filterKey(dim)
                    const efColor = r.efectividadSug==null?'var(--text3)':r.efectividadSug>=0.9?'var(--green)':r.efectividadSug>=0.8?'var(--yellow)':'var(--red)'
                    const hrColor = r.holdRelativo==null?'var(--text3)':r.holdRelativo<=0.05?'var(--green)':r.holdRelativo<=0.10?'var(--yellow)':'var(--red)'
                    return (
                      <tr key={i}>
                        <td className="bold">{label}</td>
                        <td className="num">{r.colaboradores}</td>
                        <td className="num">{formatNumber(r.totalTareas)}</td>
                        <td className="num" style={{ color:'#38bdf8' }}>{formatNumber(r.totalIds)}</td>
                        <td className="num">{formatNumber(r.promDia)}</td>
                        <td className="num" style={{ color:efColor, fontWeight:700 }}>
                          {r.efectividadSug!=null ? `${Math.round(r.efectividadSug*100)}%` : '—'}
                        </td>
                        <td className="num">{r.auditadas}</td>
                        <td className="num" style={{ color:hrColor, fontWeight:700 }}>
                          {r.holdRelativo!=null ? `${Math.round(r.holdRelativo*100)}%` : '—'}
                        </td>
                        <td>
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                            <button className="insight-action-btn"
                              onClick={() => { setFilter(fk, r.segmento); navigateTo('productividad') }}>
                              Prod →
                            </button>
                            <button className="insight-action-btn"
                              onClick={() => { setFilter(fk, r.segmento); navigateTo('calidad') }}>
                              Cal →
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Gráfico de efectividad ── */}
            {perfData.filter(r=>r.efectividadSug!=null&&r.auditadas>=3).length > 0 && (
              <div style={{ marginTop:'1rem' }}>
                <div style={{ fontSize:'0.75rem', color:'var(--text3)', marginBottom:'0.4rem' }}>
                  Efectividad de calidad por segmento — línea roja = target 90%
                </div>
                <ResponsiveContainer width="100%" height={Math.max(120, perfData.length*38)}>
                  <BarChart
                    data={perfData.filter(r=>r.efectividadSug!=null&&r.auditadas>=3)
                      .map(r=>({ ...r, label: segLabel(dim, r.segmento) }))}
                    layout="vertical" margin={{ top:0, right:60, left:0, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" domain={[0,1]} tick={{ fill:'var(--text3)', fontSize:10 }}
                      tickFormatter={v=>`${Math.round(v*100)}%`} />
                    <YAxis type="category" dataKey="label" tick={{ fill:'var(--text3)', fontSize:10 }} width={120} />
                    <Tooltip content={<CustomTooltip valueFormatter={v=>`${Math.round(v*100)}%`} />} />
                    <Bar dataKey="efectividadSug" name="Efectividad" radius={[0,3,3,0]}>
                      {perfData.filter(r=>r.efectividadSug!=null&&r.auditadas>=3).map((r,i)=>(
                        <Cell key={i} fill={r.efectividadSug>=0.9?CALIDAD_COLORS.correcto:r.efectividadSug>=0.8?CALIDAD_COLORS.desvio_leve:CALIDAD_COLORS.desvio_grave} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        ) : (
          <EmptyState message="Sin datos para esta dimensión con los filtros actuales. Probá quitar algún filtro." />
        )}
      </div>

      {/* ── BLOQUE 3: Rankings top/bottom ────────────────────── */}
      {rankings && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Rankings — top 5 y bottom 5 por dimensión</div>
            <div className="card-subtitle">Alta concentración en los extremos = riesgo operativo o de calidad.</div>
          </div>
          <div className="grid grid-2" style={{ gap:'1.5rem' }}>

            {/* Productividad */}
            <div>
              <div style={{ fontSize:'0.72rem', color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.5rem' }}>
                Productividad — tareas
              </div>
              <RankTable
                top={rankings.topProd}
                bottom={rankings.bottomProd}
                dim={dim}
                valueKey="totalTareas"
                valueLabel="Tareas"
                formatValue={formatNumber}
                topColor="var(--green)"
                bottomColor="var(--yellow)"
              />
            </div>

            {/* Calidad */}
            {rankings.topCal.length > 0 && (
              <div>
                <div style={{ fontSize:'0.72rem', color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.5rem' }}>
                  Calidad — efectividad (sugerencias)
                </div>
                <RankTable
                  top={rankings.topCal}
                  bottom={rankings.bottomCal}
                  dim={dim}
                  valueKey="efectividadSug"
                  valueLabel="Ef. sug."
                  formatValue={v=>v!=null?`${Math.round(v*100)}%`:'—'}
                  topColor="var(--green)"
                  bottomColor="var(--red)"
                />
              </div>
            )}

            {/* Mayor HOLD */}
            {rankings.masHold.length > 0 && (
              <div>
                <div style={{ fontSize:'0.72rem', color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.5rem' }}>
                  Fricción — % en espera (HOLD relativo)
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Segmento</th><th>% en espera</th><th>Registros</th></tr>
                    </thead>
                    <tbody>
                      {rankings.masHold.map((r,i)=>(
                        <tr key={i}>
                          <td className="bold">{segLabel(dim, r.segmento)}</td>
                          <td className="num" style={{ color:r.holdRelativo>0.10?'var(--red)':r.holdRelativo>0.05?'var(--yellow)':'var(--green)', fontWeight:700 }}>
                            {Math.round(r.holdRelativo*100)}%
                          </td>
                          <td className="num" style={{ color:'var(--text3)' }}>{formatNumber(r.holdRegistros)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BLOQUE 4: Riesgos ────────────────────────────────── */}
      {riesgos.length > 0 && (
        <div className="card">
          <div className="card-header" style={{ marginBottom:'0.75rem' }}>
            <div className="card-title">Riesgos organizacionales detectados</div>
            <span className="badge badge-slate" style={{ fontSize:'0.65rem' }}>
              Detectá riesgos estructurales antes de que escalen.
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {riesgos.map((r,i)=>(
              <div key={i} className={`alert-item ${r.nivel==='critico'?'alert-critico':'alert-atencion'}`}>
                <span className="alert-icon">{r.nivel==='critico'?'🔴':'🟡'}</span>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:'0.82rem', color:'var(--text2)' }}>{r.texto}</span>
                  {r.drill && (
                    <button className="insight-action-btn" style={{ marginLeft:'0.75rem' }}
                      onClick={() => {
                        if (r.drill.filter) for (const [k,v] of Object.entries(r.drill.filter)) setFilter(k, v)
                        navigateTo(r.drill.tab)
                      }}>
                      Revisar en {r.drill.tab} →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Directorio del equipo — oculto (no suma valor en vista operativa) */}
    </div>
  )
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{ background:'var(--bg3)', borderRadius:'var(--radius-sm)', padding:'0.6rem 0.85rem' }}>
      <div style={{ fontSize:'0.68rem', color:'var(--text3)', marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:'1.25rem', fontWeight:700, color: color || 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize:'0.65rem', color:'var(--text3)' }}>{sub}</div>}
    </div>
  )
}

function ComposicionList({ title, items, total }) {
  return (
    <div>
      <div style={{ fontSize:'0.68rem', color:'var(--text3)', fontWeight:700, marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>{title}</div>
      {items.slice(0,6).map(({ key, count }) => (
        <div key={key} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', padding:'3px 0', borderBottom:'1px solid var(--border)' }}>
          <span style={{ color:'var(--text2)' }}>{key}</span>
          <span style={{ color:'var(--text)', fontWeight:600 }}>
            {count} <span style={{ color:'var(--text3)', fontWeight:400 }}>({Math.round(count/total*100)}%)</span>
          </span>
        </div>
      ))}
    </div>
  )
}

function RankTable({ top, bottom, dim, valueKey, valueLabel, formatValue, topColor, bottomColor }) {
  const allRows = [
    ...top.map((r,i) => ({ ...r, rank: i+1, type:'top' })),
    ...bottom.map((r,i) => ({ ...r, rank: i+1, type:'bottom' })),
  ]
  if (!allRows.length) return null
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>#</th><th>Segmento</th><th>{valueLabel}</th></tr>
        </thead>
        <tbody>
          {top.map((r,i) => (
            <tr key={`top-${i}`}>
              <td style={{ color:'var(--text3)' }}>{i+1}</td>
              <td className="bold">{segLabel(dim, r.segmento)}</td>
              <td className="num" style={{ color: topColor, fontWeight:700 }}>{formatValue(r[valueKey])}</td>
            </tr>
          ))}
          {bottom.length > 0 && top.length > 0 && (
            <tr><td colSpan={3} style={{ borderTop:'2px dashed var(--border2)', padding:0 }} /></tr>
          )}
          {bottom.map((r,i) => (
            <tr key={`bot-${i}`}>
              <td style={{ color:'var(--text3)' }}>↓{i+1}</td>
              <td className="bold">{segLabel(dim, r.segmento)}</td>
              <td className="num" style={{ color: bottomColor, fontWeight:700 }}>{formatValue(r[valueKey])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DirectorioTable({ equipo }) {
  const data = equipo.map(e => ({
    ...e,
    nombreDisplay: e.nombre || e.idMeli,
  }))
  const { sorted, sortKey, sortDir, onSort } = useTableSort(data, data)
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Directorio del equipo</div>
          <div className="card-subtitle">{equipo.length} colaboradores</div>
        </div>
        <ExportCSVButton
          data={equipo.map(e=>({ id_meli:e.idMeli, nombre:e.nombre, rol:e.rol, equipo:e.equipo,
            ubicacion:e.ubicacion, antiguedad_dias:e.antiguedadDias, segmento:e.segmentoAntiguedad }))}
          filename="equipo.csv"
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortTh colKey="idMeli"        label="ID"         sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh colKey="nombreDisplay" label="Nombre"     sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh colKey="rol"           label="Rol"        sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh colKey="equipo"        label="Equipo"     sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh colKey="ubicacion"     label="Ubicación"  sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortTh colKey="antiguedadDias" label="Antigüedad" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((e,i)=>(
              <tr key={i}>
                <td style={{ fontSize:'0.72rem', color:'var(--text3)' }}>{e.idMeli}</td>
                <td className="bold">{e.nombreDisplay}</td>
                <td>{e.rol||'—'}</td>
                <td>{e.equipo||'—'}</td>
                <td>{e.ubicacion||'—'}</td>
                <td>{e.antiguedadDias!=null?`${e.antiguedadDias}d`:'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
