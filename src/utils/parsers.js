/**
 * PARSERS v4
 * Manejo robusto de fechas y números.
 * Soporta: DD/MM/YYYY · YYYY-MM-DD · DD-MM-YYYY (equipo_colaboradores.csv)
 */

export function parseDate(raw) {
  if (!raw || typeof raw !== 'string') return null
  const s = raw.trim()

  // YYYY-MM-DD (ISO) — debe chequearse primero para no confundir con DD-MM-YYYY
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.substring(0, 10) + 'T00:00:00')
    return isNaN(d) ? null : d
  }

  // DD/MM/YYYY o D/M/YYYY
  const partsSlash = s.split('/')
  if (partsSlash.length === 3) {
    const [d, m, y] = partsSlash.map(Number)
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y > 1900) {
      const date = new Date(y, m - 1, d)
      return isNaN(date) ? null : date
    }
  }

  // DD-MM-YYYY (separador guion, formato de equipo_colaboradores.csv)
  // Solo aplica si el tercer segmento tiene 4 dígitos (es el año)
  const partsDash = s.split('-')
  if (partsDash.length === 3 && partsDash[2].length === 4) {
    const [d, m, y] = partsDash.map(Number)
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y > 1900) {
      const date = new Date(y, m - 1, d)
      return isNaN(date) ? null : date
    }
  }

  return null
}

export function toDateKey(date) {
  if (!date) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDateDisplay(date) {
  if (!date) return '—'
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}/${m}/${y}`
}

export function getWeekNumber(date) {
  if (!date) return null
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

export function parseNumber(raw) {
  if (raw === null || raw === undefined || raw === '') return 0
  if (typeof raw === 'number') return raw
  const s = String(raw).replace(',', '.').replace('%', '').trim()
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

export function normalizeKey(str) {
  return String(str || '').trim().toLowerCase()
}

export function safeGet(obj, key, fallback = null) {
  if (!obj) return fallback
  if (key in obj) return obj[key] ?? fallback
  const nk = normalizeKey(key)
  for (const k of Object.keys(obj)) {
    if (normalizeKey(k) === nk) return obj[k] ?? fallback
  }
  return fallback
}

export function truncate(str, max = 30) {
  if (!str) return '—'
  return str.length > max ? str.substring(0, max) + '…' : str
}

export function formatNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return new Intl.NumberFormat('es-AR').format(n)
}

export function formatPct(n, decimals = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return `${(n * 100).toFixed(decimals)}%`
}
