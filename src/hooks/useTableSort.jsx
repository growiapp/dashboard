import { useState, useMemo } from 'react'

export function useTableSort(data, defaultData = null) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState(null) // 'asc' | 'desc' | null

  function handleSort(key) {
    setSortKey(prev => {
      if (prev !== key) {
        // Nueva columna: ascendente
        setSortDir('asc')
        return key
      }
      // Misma columna: ciclar asc → desc → null
      setSortDir(d => {
        if (d === 'asc') return 'desc'
        if (d === 'desc') { setSortKey(null); return null }
        return 'asc'
      })
      return prev
    })
  }

  // Simplificado: manejar el ciclo completo en un solo lugar
  function onSort(key) {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else if (sortDir === 'desc') {
      setSortKey(null)
      setSortDir(null)
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    const base = defaultData ?? data
    if (!sortKey || !sortDir || !base?.length) return base
    return [...base].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      // Nulls siempre al final
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      // Numérico
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      // Texto
      const as = String(av).toLowerCase()
      const bs = String(bv).toLowerCase()
      const cmp = as.localeCompare(bs, 'es')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, defaultData, sortKey, sortDir])

  return { sorted, sortKey, sortDir, onSort }
}

export function SortTh({ colKey, label, sortKey, sortDir, onSort, title, style }) {
  const active = sortKey === colKey
  const icon = !active ? '⇅' : sortDir === 'asc' ? '↑' : '↓'
  return (
    <th
      onClick={() => onSort(colKey)}
      title={title}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {label}{' '}
      <span style={{ opacity: active ? 1 : 0.35, fontSize: '0.7em' }}>{icon}</span>
    </th>
  )
}
