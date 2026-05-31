import { useEffect, useState } from 'react'
import { adminFetch } from '../auth'

const API = import.meta.env.VITE_API_URL || '/api'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function AdminPredictions() {
  const [predictions, setPredictions] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [diagnosisFilter, setDiagnosisFilter] = useState('all')
  const [uniqueDiagnosis, setUniqueDiagnosis] = useState([])

  useEffect(() => {
    adminFetch(`${API}/admin/predictions?limit=100`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        setPredictions(data)
        // Extraire les diagnostics uniques
        const diagnoses = [...new Set(data.map((p) => p.diagnosis))]
        setUniqueDiagnosis(diagnoses.sort())
      })
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return (
      <div className="dash">
        <div className="empty">Erreur de chargement : {error}</div>
      </div>
    )
  }
  if (predictions === null) {
    return (
      <div className="dash">
        <div className="empty">Chargement...</div>
      </div>
    )
  }

  const filtered = predictions.filter((p) => {
    const matchQuery = query === '' || (p.patient_name || '').toLowerCase().includes(query.toLowerCase())
    const matchDiagnosis = diagnosisFilter === 'all' || p.diagnosis === diagnosisFilter
    return matchQuery && matchDiagnosis
  })

  return (
    <div className="dash">
      <div className="dash-header">
        <h1>Diagnostics</h1>
        <p>Historique des diagnostics médicaux. {filtered.length} résultat{filtered.length > 1 ? 's' : ''}.</p>
      </div>

      <div className="filters">
        <input
          type="search"
          placeholder="Rechercher par nom du patient..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search"
        />
        <select value={diagnosisFilter} onChange={(e) => setDiagnosisFilter(e.target.value)} className="filter-select">
          <option value="all">Tous les diagnostics</option>
          {uniqueDiagnosis.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="dash-card no-pad">
        {filtered.length === 0 ? (
          <div className="empty">
            {predictions.length === 0
              ? 'Aucun diagnostic pour l\'instant. Soumettez-en un depuis le formulaire.'
              : 'Aucun diagnostic ne correspond à votre recherche.'}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Patient</th>
                <th>Diagnostic</th>
                <th>Confiance</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="mono">#{p.id}</td>
                  <td>{p.patient_name || <span className="muted">Anonyme</span>}</td>
                  <td>{p.diagnosis}</td>
                  <td>
                    {p.confidence !== null && p.confidence !== undefined ? (
                      <div className="confidence-bar">
                        <span className="confidence-bar-fill" style={{ width: `${p.confidence * 100}%` }} />
                        <span className="confidence-bar-text">{Math.round(p.confidence * 100)}%</span>
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="muted">{formatDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
