/**
 * QUERY STATE
 * Lectura y escritura de filtros en URL query params
 */

export const URL_PARAM_KEYS = [
  'tab','preset','desde','hasta','semana','usuario','flujo',
  'rol','equipo','ubicacion','segAnti','extUser','status',
  'auditor','dominio','suggestionReason','calidad',
]

export function readFromURL() {
  const p = new URLSearchParams(window.location.search)
  const out = {}
  for (const k of URL_PARAM_KEYS) { const v = p.get(k); if (v) out[k] = v }
  return out
}

export function writeToURL(obj) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(obj)) {
    if (v != null && v !== '' && v !== 'all' && v !== false) p.set(k, String(v))
  }
  const qs = p.toString()
  window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname)
}
