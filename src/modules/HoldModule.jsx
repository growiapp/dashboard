import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell
} from 'recharts'
import { DATA_SOURCES } from '../config/datasources.js'
import {
  calcHoldKPIs,
  holdSnapshotStats,
  holdPorSemana,
} from '../utils/aggregators.js'
import { formatNumber } from '../utils/parsers.js'
import { KPICard, CoverageBadge, ExportCSVButton, EmptyState, SectionHeader, CustomTooltip } from '../components/ui/index.jsx'
import { formatHoldHistorico } from '../utils/exportUtils.js'
import { useTableSort, SortTh } from '../hooks/useTableSort.jsx'

const INCIDENCIA_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
]

export function HoldModule({ filtered, holdSnapshot }) {
  const { historico } = filtered

  const kpisHold = useMemo(() => historico.length ? calcHoldKPIs(historico) : null, [historico])
  const snapshotStats = useMemo(() => holdSnapshot.length ? holdSnapshotStats(holdSnapshot) : null, [holdSnapshot])
  const holdWeekly = useMemo(() => holdPorSemana(historico), [historico])

  if (!historico.length && !holdSnapshot.length) {
    return <EmptyState message="Sin datos de HOLD para el período seleccionado." />
  }

  const byFlujoData = kpisHold
    ? Object.entries(kpisHold.byFlujo).map(([flujo, total]) => ({ flujo, total })).sort((a, b) => b.total - a.total)
    : []

  const byUsuarioData = kpisHold
    ? Object.entries(kpisHold.byUsuario).map(([usuario, total]) => ({ usuario, total, pct: kpisHold.total > 0 ? Math.round(total / kpisHold.total * 100) : 0 })).sort((a, b) => b.total - a.total)
    : []

  const topIncidenciasData = kpisHold
    ? Object.entries(kpisHold.byIncidencia).sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([inc, cnt]) => ({ incidencia: inc, cnt, pct: kpisHold.total > 0 ? Math.round(cnt / kpisHold.total * 100) : 0 }))
    : []

  const { sorted: usuarioSorted, sortKey: usuSortKey, sortDir: usuSortDir, onSort: usuOnSort } = useTableSort(byUsuarioData, byUsuarioData)
  const { sorted: incSorted, sortKey: incSortKey, sortDir: incSortDir, onSort: incOnSort } = useTableSort(topIncidenciasData, topIncidenciasData)

  // Impacto: % del histórico que es HOLD
  const totalHistorico = historico.length
  const pctHold = kpisHold && totalHistorico > 0 ? Math.round(kpisHold.total / totalHistorico * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* KPIs */}
      <div className="grid grid-4">
        {kpisHold && (
          <>
            <KPICard
              label="HOLD histórico"
              value={formatNumber(kpisHold.total)}
              sub={`${pctHold}% del total de registros del período`}
              icon="⏸️"
              color="var(--red)"
            />
            <KPICard
              label="Flujo más afectado"
              value={Object.entries(kpisHold.byFlujo).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'}
              sub={`${formatNumber(Object.entries(kpisHold.byFlujo).sort((a, b) => b[1] - a[1])[0]?.[1] || 0)} registros HOLD`}
              icon="🔀"
              color="var(--yellow)"
            />
          </>
        )}
        {snapshotStats && (
          <>
            <KPICard
              label="HOLD activo"
              value={formatNumber(snapshotStats.total)}
              sub="Tareas abiertas al 31/03/2026"
              icon="🔴"
              color="var(--red)"
            />
            <div className="card">
              <div className="card-header" style={{ marginBottom: '0.5rem' }}>
                <span className="card-title">HOLD activo · por flujo</span>
                <span className="badge badge-yellow">Snapshot 31/03</span>
              </div>
              {Object.entries(snapshotStats.byFlujo).sort((a, b) => b[1] - a[1]).map(([flujo, cnt]) => (
                <div key={flujo} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.2rem 0' }}>
                  <span style={{ color: 'var(--text2)' }}>{flujo}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{cnt}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tendencia semanal */}
      {holdWeekly.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">HOLD histórico por semana</div>
              <div className="card-subtitle">Evolución de registros en estado HOLD</div>
            </div>
            <CoverageBadge label={DATA_SOURCES.historico.coverageLabel} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={holdWeekly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fill: 'var(--text3)', fontSize: 11 }} tickFormatter={v => `S${v}`} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip labelFormatter={v => `Semana ${v}`} valueFormatter={formatNumber} />} />
              <Bar dataKey="total" name="HOLD" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-2">
        {/* HOLD por flujo */}
        {byFlujoData.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">HOLD histórico por flujo</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byFlujoData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text3)', fontSize: 10 }} tickFormatter={formatNumber} />
                <YAxis type="category" dataKey="flujo" tick={{ fill: 'var(--text3)', fontSize: 10 }} width={110} />
                <Tooltip content={<CustomTooltip valueFormatter={formatNumber} />} />
                <Bar dataKey="total" name="HOLD" fill="#f97316" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Incidencias recurrentes */}
        {incSorted.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Incidencias en HOLD (top 10)</div>
                <div className="card-subtitle">Focos de fricción operativa</div>
              </div>
              <ExportCSVButton data={incSorted.map(r=>({'Incidencia':r.incidencia,'Registros HOLD':r.cnt,'%':r.pct+'%'}))} filename="hold_incidencias.csv" />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <SortTh colKey="incidencia" label="Incidencia"    sortKey={incSortKey} sortDir={incSortDir} onSort={incOnSort} />
                    <SortTh colKey="cnt"        label="Registros HOLD" sortKey={incSortKey} sortDir={incSortDir} onSort={incOnSort} />
                    <SortTh colKey="pct"        label="%"              sortKey={incSortKey} sortDir={incSortDir} onSort={incOnSort} />
                  </tr>
                </thead>
                <tbody>
                  {incSorted.map((r, i) => (
                    <tr key={r.incidencia}>
                      <td>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: INCIDENCIA_COLORS[i % INCIDENCIA_COLORS.length], display: 'inline-block', marginRight: 6 }} />
                        {r.incidencia}
                      </td>
                      <td className="num bold">{formatNumber(r.cnt)}</td>
                      <td className="num" style={{ color: 'var(--text3)' }}>{r.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* HOLD por colaborador */}
      {byUsuarioData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">HOLD por colaborador (histórico)</div>
              <div className="card-subtitle">Concentración de fricción por persona</div>
            </div>
            <ExportCSVButton
              data={formatHoldHistorico(byUsuarioData, kpisHold?.total || 0)}
              filename="hold_por_colaborador.csv"
            />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <SortTh colKey="usuario" label="Usuario"        sortKey={usuSortKey} sortDir={usuSortDir} onSort={usuOnSort} />
                  <SortTh colKey="total"   label="HOLD histórico" sortKey={usuSortKey} sortDir={usuSortDir} onSort={usuOnSort} />
                  <SortTh colKey="pct"     label="% del total"    sortKey={usuSortKey} sortDir={usuSortDir} onSort={usuOnSort} />
                </tr>
              </thead>
              <tbody>
                {usuarioSorted.map((r, i) => (
                  <tr key={r.usuario}>
                    <td style={{ color: 'var(--text3)' }}>{i + 1}</td>
                    <td className="bold">{r.usuario}</td>
                    <td className="num">{formatNumber(r.total)}</td>
                    <td className="num" style={{ color: 'var(--yellow)' }}>{r.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HOLD activo detalle */}
      {holdSnapshot.length > 0 && snapshotStats && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Detalle HOLD activo · 31/03/2026</div>
              <div className="card-subtitle">Snapshot — no disponible para análisis de tendencia</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="badge badge-red">Snapshot 31/03</span>
              <ExportCSVButton data={holdSnapshot} filename="hold_activo_31032026.csv" />
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Flujo</th>
                  <th>ID</th>
                  <th>Iniciativa</th>
                  <th>Incidencia</th>
                  <th>IDs TC</th>
                </tr>
              </thead>
              <tbody>
                {holdSnapshot.slice(0, 50).map((r, i) => (
                  <tr key={i}>
                    <td className="bold">{r.usuario}</td>
                    <td>{r.flujo}</td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{r.idLink}</td>
                    <td>{r.iniciativa || '—'}</td>
                    <td>
                      {r.incidencia ? (
                        <span className="badge badge-yellow">{r.incidencia}</span>
                      ) : '—'}
                    </td>
                    <td className="num">{r.idsTC}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {holdSnapshot.length > 50 && (
              <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: 'var(--text3)' }}>
                Mostrando 50 de {holdSnapshot.length} registros. Exportar CSV para ver todos.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
