import { useState, useEffect } from 'react'

const cache = new Map() // Caché en memoria para no repetir la request en la misma sesión

export function useGitHubFileDate(owner, repo, filePath, branch = 'main') {
  const [date, setDate]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    const key = `${owner}/${repo}/${branch}/${filePath}`
    if (cache.has(key)) {
      setDate(cache.get(key))
      setLoading(false)
      return
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/commits?path=${filePath}&per_page=1&sha=${branch}`

    fetch(url, { headers: { Accept: 'application/vnd.github.v3+json' } })
      .then(r => {
        if (!r.ok) throw new Error(`GitHub API ${r.status}`)
        return r.json()
      })
      .then(data => {
        const committed = data?.[0]?.commit?.committer?.date
        const d = committed ? new Date(committed) : null
        cache.set(key, d)
        setDate(d)
        setLoading(false)
      })
      .catch(err => {
        console.warn('[GitHub date] No se pudo obtener la fecha del archivo:', err.message)
        setError(err.message)
        setLoading(false)
      })
  }, [owner, repo, filePath, branch])

  return { date, loading, error }
}
