import { useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatNumber } from '../utils/parsers.js'
import { COPY } from '../config/copy.js'
import { delta, deltaLabel, deltaColor } from '../utils/metrics/comparisonMetrics.js'
import { EmptyState, CustomTooltip, ExportCSVButton } from '../components/ui/index.jsx'
import { useTableSort, SortTh } from '../hooks/useTableSort.jsx'
import { formatProductividadColab } from '../utils/exportUtils.js'

const FLUJO_COLORS = {
  'Demanda':'#6366f1','Enhancement':'#38bdf8','Enhanced Content':'#a78bfa',
  'Soporte':'#fb923c','Fallos':'#ef4444','Validación':'#22c55e',
}

export function ProductividadModule({ model }) {
  const { prodModel } = model
  if (!prodModel) return <EmptyState message={COPY.empty} />

  const { kpis, semanas, ranking, top5, bottom5, complejidadFlujo, colabActivos, promDiasActivos, prevKpis } = prodModel
  const dTareas = delta(kpis.totalTareas,     prevKpis?.totalTareas)
  const dIds    = delta(kpis.totalIds,         prevKpis?.totalIds)
  const dDia    = delta(kpis.promTareasPorDia, prevKpis?.promTareasPorDia)

  const { sorted: rankingSorted, sortKey: rankSortKey, sortDir: rankSortDir, onSort: rankOnSort } = useTableSort(ranking, ranking)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

      <div className="metric-note metric-note-important">
        ℹ️ {COPY.modules.prodTareasVsIds}
      </div>

      {/* ── CAPACIDAD ────────────────────────────────────────── */}
      <SectionLabel>Capacidad</SectionLabel>
      <div className="grid grid-4">
        <KPIv6 label={COPY.kpis.colaborActivos.label} value={colabActivos}
          help={COPY.kpis.colaborActivos.help} icon="👥" color="var(--accent)" />
        <KPIv6 label={COPY.kpis.diasActivos.label} value={`${promDiasActivos}d`}
          help={COPY.kpis.diasActivos.help} icon="📅" color="var(--accent2)" />
      </div>

      {/* ── TAREAS FINALIZADAS ───────────────────────────────── */}
      <SectionLabel>Tareas</SectionLabel>
      <div className="metric-note">Una tarea = un registro en el histórico operativo. Distinto de IDs.</div>
      <div className="grid grid-4">
        <KPIv6 label={COPY.kpis.tareasFinalizadas.label} value={formatNumber(kpis.totalTareas)}
          help={COPY.kpis.tareasFinalizadas.help} icon="📦" color="var(--accent)" d={dTareas} />
        <KPIv6 label={COPY.kpis.prodPorDia.label} value={`${formatNumber(kpis.promTareasPorDia)} / día`}
          help={COPY.kpis.prodPorDia.help} icon="⚡" color="var(--green)" d={dDia} />
      </div>

      {/* ── IDs TRABAJADOS ───────────────────────────────────── */}
      <SectionLabel>IDs trabajados</SectionLabel>
      <div className="metric-note">Un ID = un producto distinto accionado. Una tarea puede involucrar varios IDs. Si el campo estaba vacío, se asume 1 por tarea (regla de negocio).</div>
      <div className="grid grid-4">
        <KPIv6 label={COPY.kpis.idsTC.label} value={formatNumber(kpis.totalIds)}
          help={COPY.kpis.idsTC.help} icon="🔗" color="#38bdf8" d={dIds} />
        <KPIv6 label={COPY.kpis.idsPorDia.label} value={`${formatNumber(kpis.promIdsPorDia)} / día`}
          help={COPY.kpis.idsPorDia.help} icon="🔢" color="#a78bfa" />
        <KPIv6 label={COPY.kpis.relTareasIds.label} value={`${kpis.relIdsPorTarea}x`}
          help={COPY.kpis.relTareasIds.help} icon="🔄" color="var(--slate)" />
      </div>

      {/* ── TENDENCIA SEMANAL ─────────────────────────────────── */}
      {semanas.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Tendencia semanal — Tareas e IDs</div>
              <div className="card-subtitle">
                Barras = tareas · Línea = IDs trabajados. Si divergen, la complejidad promedio cambió.
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={semanas} margin={{ top:5, right:40, left:0, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fill:'var(--text3)', fontSize:11 }}
                tickFormatter={v=>`Sem ${v}`} />
              <YAxis yAxisId="left" tick={{ fill:'var(--text3)', fontSize:11 }}
                tickFormatter={formatNumber} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill:'var(--text3)', fontSize:11 }}
                tickFormatter={formatNumber} />
              <Tooltip content={<CustomTooltip labelFormatter={v=>`Semana ${v}`} valueFormatter={formatNumber} />} />
              <Legend wrapperStyle={{ fontSize:'0.72rem', color:'var(--text3)' }} />
              {/* Barras: tareas desde historico */}
              <Bar yAxisId="left" dataKey="totalTareas" name="Tareas"
                fill="var(--accent)" radius={[3,3,0,0]} />
              {/* Línea: IDs trabajados desde historico */}
              <Line yAxisId="right" type="monotone" dataKey="totalIds" name="IDs trabajados"
                stroke="#fb923c" strokeWidth={2} dot={{ r:3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── DISTRIBUCIÓN POR FLUJO (tareas) ─────────────────── */}
      {kpis.byFlujo && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Distribución de tareas por flujo</div>
            <div className="card-subtitle">Alta concentración en un solo flujo = riesgo operativo si ese flujo se traba.</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
            {Object.entries(kpis.byFlujo).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([flujo,val]) => {
              const max = Math.max(...Object.values(kpis.byFlujo))
              return (
                <div key={flujo}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', marginBottom:3 }}>
                    <span style={{ color:'var(--text2)' }}>{flujo}</span>
                    <span style={{ color:'var(--text)', fontWeight:600 }}>
                      {formatNumber(val)} tareas
                      <span style={{ color:'var(--text3)', fontWeight:400, marginLeft:4 }}>
                        ({kpis.totalTareas>0?Math.round(val/kpis.totalTareas*100):0}%)
                      </span>
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill"
                      style={{ width:`${max>0?val/max*100:0}%`,
                               background: FLUJO_COLORS[flujo]||'var(--accent)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── COMPLEJIDAD POR FLUJO ─────────────────────────────── */}
      {complejidadFlujo?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Complejidad operativa por flujo</div>
              <div className="card-subtitle">IDs por tarea en cada flujo. Más alto = cada tarea involucra más productos = mayor carga operativa.</div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
            {complejidadFlujo.map(f => {
              const max = complejidadFlujo[0].relIdsPorTarea || 1
              return (
                <div key={f.flujo}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', marginBottom:3 }}>
                    <span style={{ color:'var(--text2)' }}>{f.flujo}</span>
                    <span style={{ color:'var(--text)', fontWeight:600 }}>
                      {f.relIdsPorTarea}x IDs/tarea
                      <span style={{ color:'var(--text3)', fontWeight:400, marginLeft:4 }}>
                        ({formatNumber(f.totalTareas)} tareas)
                      </span>
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill"
                      style={{ width:`${(f.relIdsPorTarea/max)*100}%`,
                               background: FLUJO_COLORS[f.flujo] || 'var(--accent)' }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="metric-note" style={{ marginTop:'0.5rem' }}>
            IDs/tarea &gt; 1x significa que las tareas de ese flujo accionan múltiples productos en promedio.
          </div>
        </div>
      )}

      {/* ── TOP 5 / BOTTOM 5 ─────────────────────────────────── */}
      {(top5?.length > 0 || bottom5?.length > 0) && (
        <div className="grid grid-2">
          <RankCard title="Top 5 — más tareas" rows={top5} color="var(--green)" />
          <RankCard title="Bottom 5 — menos tareas" rows={bottom5} color="var(--yellow)" />
        </div>
      )}

      {/* ── RANKING COMPLETO ──────────────────────────────────── */}
      {ranking.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Ranking completo por colaborador</div>
              <div className="card-subtitle">Tareas e IDs son columnas separadas. No son sinónimos.</div>
            </div>
            <ExportCSVButton
              data={formatProductividadColab(ranking)}
              filename="productividad_colaboradores.csv"
            />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <SortTh colKey="usuario"          label="Colaborador"  sortKey={rankSortKey} sortDir={rankSortDir} onSort={rankOnSort} />
                  <SortTh colKey="totalTareas"      label="Tareas"       sortKey={rankSortKey} sortDir={rankSortDir} onSort={rankOnSort} title={COPY.kpis.tareasFinalizadas.help} />
                  <SortTh colKey="totalIds"         label="IDs"          sortKey={rankSortKey} sortDir={rankSortDir} onSort={rankOnSort} title={COPY.kpis.idsTC.help} />
                  <SortTh colKey="relIdsPorTarea"   label="IDs/tarea"    sortKey={rankSortKey} sortDir={rankSortDir} onSort={rankOnSort} title={COPY.kpis.relTareasIds.help} />
                  <SortTh colKey="diasHabiles"      label="Días activos" sortKey={rankSortKey} sortDir={rankSortDir} onSort={rankOnSort} />
                  <SortTh colKey="promTareasPorDia" label="Tareas/día"   sortKey={rankSortKey} sortDir={rankSortDir} onSort={rankOnSort} />
                </tr>
              </thead>
              <tbody>
                {rankingSorted.map((r, i) => (
                  <tr key={r.usuario}>
                    <td style={{ color:'var(--text3)' }}>{i+1}</td>
                    <td style={{ fontWeight:600 }}>{r.usuario}</td>
                    <td>{formatNumber(r.totalTareas)}</td>
                    <td style={{ color:'#38bdf8' }}>{formatNumber(r.totalIds)}</td>
                    <td style={{ color:'var(--text3)' }}>{r.relIdsPorTarea}x</td>
                    <td>{r.diasHabiles}</td>
                    <td>{formatNumber(r.promTareasPorDia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text3)' }}>
      {children}
    </div>
  )
}

function KPIv6({ label, value, help, icon, color, d }) {
  const dl = d != null ? deltaLabel(d) : null
  const dc = d != null ? deltaColor(d) : null
  return (
    <div className="card">
      <div className="card-header" style={{ marginBottom:'0.4rem' }}>
        <span className="card-title" title={help}>{label}{help && <span style={{ fontSize:'0.65rem', color:'var(--text3)', marginLeft:3 }}>ⓘ</span>}</span>
        {icon && <div className="kpi-icon" style={{ background:`${color}20`, color }}>{icon}</div>}
      </div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      {dl && <div style={{ fontSize:'0.72rem', color:dc, marginTop:2, fontWeight:600 }}>{dl} vs período anterior</div>}
      {help && <div className="kpi-sub">{help}</div>}
    </div>
  )
}

function RankCard({ title, rows, color }) {
  if (!rows?.length) return null
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom:'0.75rem' }}>{title}</div>
      <table style={{ width:'100%', fontSize:'0.78rem', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            <th style={{ color:'var(--text3)', padding:'4px 0', borderBottom:'1px solid var(--border)' }}>Colaborador</th>
            <th style={{ color:'var(--text3)', padding:'4px 0', borderBottom:'1px solid var(--border)' }}>Tareas</th>
            <th style={{ color:'var(--text3)', padding:'4px 0', borderBottom:'1px solid var(--border)' }}>IDs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.usuario}>
              <td style={{ padding:'5px 0', borderBottom:'1px solid var(--border)' }}>{r.usuario}</td>
              <td style={{ padding:'5px 0', borderBottom:'1px solid var(--border)', fontWeight:600, color }}>{formatNumber(r.totalTareas)}</td>
              <td style={{ padding:'5px 0', borderBottom:'1px solid var(--border)', color:'var(--text3)' }}>{formatNumber(r.totalIds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
