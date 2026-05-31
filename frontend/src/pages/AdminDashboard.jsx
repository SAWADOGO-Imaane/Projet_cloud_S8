import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { adminFetch } from '../auth'

const API = import.meta.env.VITE_API_URL || '/api'

// Couleurs pour chaque diagnostic
const DIAGNOSIS_COLORS = {
  'Common Cold': '#4CAF50',
  'Influenza': '#FF9800',
  'COVID-19': '#F44336',
  'Bronchitis': '#2196F3',
  'Pneumonia': '#9C27B0',
  'Gastroenteritis': '#FFC107',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    adminFetch(`${API}/admin/stats`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setStats)
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return (
      <div className="dash">
        <div className="empty">Erreur de chargement : {error}</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="dash">
        <div className="empty">Chargement...</div>
      </div>
    )
  }

  const { kpi, daily, score_distribution, status_breakdown } = stats
  const isEmpty = kpi.total === 0

  return (
    <div className="dash">
      <div className="dash-header">
        <h1>Tableau de bord</h1>
        <p>Vue d'ensemble des diagnostics traités par la plateforme.</p>
      </div>

      {isEmpty && (
        <div className="empty-state">
          <h3>Aucune donnée pour l'instant</h3>
          <p>
            Soumettez un diagnostic depuis le <a href="/">formulaire</a> — il apparaîtra ici.
          </p>
        </div>
      )}

      <div className="kpi-grid">
        <Kpi label="Total diagnostics" value={kpi.total} />
        <Kpi label="Confiance moyenne" value={`${Math.round(kpi.avg_confidence * 100)}%`} />
        <Kpi label="Diagnostic le plus fréquent" value={kpi.top_diagnosis} />
        <Kpi label="Cette semaine" value={kpi.this_week} />
      </div>

      <div className="dash-grid">
        <div className="dash-card wide">
          <div className="dash-card-header">
            <h2>Diagnostics par jour</h2>
            <span className="dash-card-sub">14 derniers jours</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00BCD4" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#00BCD4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#757575' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#757575' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E0E0E0', fontSize: 13 }} />
              <Area type="monotone" dataKey="count" stroke="#00BCD4" strokeWidth={2} fill="url(#cyanGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <h2>Diagnostics</h2>
            <span className="dash-card-sub">Top 10</span>
          </div>
          {status_breakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={status_breakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                    {status_breakdown.map((entry) => (
                      <Cell key={entry.name} fill={DIAGNOSIS_COLORS[entry.name] || '#9E9E9E'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="legend">
                {status_breakdown.map((s) => (
                  <div key={s.name} className="legend-item">
                    <span className="legend-dot" style={{ background: DIAGNOSIS_COLORS[s.name] || '#9E9E9E' }} />
                    {s.name} <strong>{s.value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty">Pas de données.</div>
          )}
        </div>

        <div className="dash-card wide">
          <div className="dash-card-header">
            <h2>Distribution de confiance</h2>
            <span className="dash-card-sub">Tous les diagnostics</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={score_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="bin" tick={{ fontSize: 11, fill: '#757575' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#757575' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E0E0E0', fontSize: 13 }} />
              <Bar dataKey="n" fill="#1A237E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, suffix }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value}
        {suffix && <span className="kpi-suffix">{suffix}</span>}
      </div>
    </div>
  )
}
