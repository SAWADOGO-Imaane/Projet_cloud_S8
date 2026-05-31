import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getToken, getUser, logout } from '../auth'

const API = import.meta.env.VITE_API_URL || '/api'

const SYMPTOMS = [
  { label: 'Fièvre', value: 'fever' },
  { label: 'Toux', value: 'cough' },
  { label: 'Fatigue', value: 'fatigue' },
  { label: 'Difficulté respiratoire', value: 'difficulty_breathing' },
  { label: 'Mal de gorge', value: 'sore_throat' },
  { label: 'Mal de tête', value: 'headache' },
  { label: 'Douleur musculaire', value: 'muscle_pain' },
  { label: 'Douleur thoracique', value: 'chest_pain' },
  { label: 'Nausée', value: 'nausea' },
  { label: 'Vomissements', value: 'vomiting' },
  { label: 'Diarrhée', value: 'diarrhea' },
  { label: 'Perte de goût', value: 'loss_of_taste' },
  { label: 'Perte d\'odorat', value: 'loss_of_smell' },
  { label: 'Éruption cutanée', value: 'skin_rash' },
  { label: 'Courbatures', value: 'body_aches' },
  { label: 'Frissons', value: 'chills' },
  { label: 'Congestion', value: 'congestion' },
]

const DISEASE_COLORS = {
  'Common Cold': '#4CAF50',
  'Influenza': '#FF9800',
  'COVID-19': '#F44336',
  'Bronchitis': '#2196F3',
  'Pneumonia': '#9C27B0',
  'Gastroenteritis': '#FFC107',
}

export default function PublicForm() {
  const navigate = useNavigate()
  const user = getUser()
  const [step, setStep] = useState('form')
  const [health, setHealth] = useState('checking')
  const [form, setForm] = useState({
    patient_name: '',
    symptoms: Array(17).fill(0),
  })
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then((d) => setHealth(d.status))
      .catch(() => setHealth('down'))
  }, [])

  const toggleSymptom = (index) => {
    setForm((f) => {
      const newSymptoms = [...f.symptoms]
      newSymptoms[index] = newSymptoms[index] === 0 ? 1 : 0
      return { ...f, symptoms: newSymptoms }
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setStep('loading')

    try {
      const r = await fetch(`${API}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          symptoms: form.symptoms,
          patient_name: form.patient_name,
        }),
      })
      if (r.status === 401 || r.status === 403) {
        logout()
        navigate('/login', { replace: true })
        return
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setResult(data)
      setStep('result')
    } catch (err) {
      setError(err.message)
      setStep('form')
    }
  }

  const reset = () => {
    setStep('form')
    setResult(null)
    setError(null)
    setForm({
      patient_name: '',
      symptoms: Array(17).fill(0),
    })
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-mark">🏥</div>
            <div>
              <div className="brand-name">HealthCare</div>
              <div className="brand-sub">Diagnostic médical assisté par IA</div>
            </div>
          </div>
          <div className="header-right">
            <div className={`health health-${health}`}>
              <span className="health-dot" />
              {health === 'ok' ? 'En ligne' : health === 'down' ? 'Indisponible' : 'Connexion...'}
            </div>
            {user?.role === 'admin' && (
              <Link to="/admin" className="admin-link">
                Espace admin →
              </Link>
            )}
            <div className="header-user">
              <span>{user?.name || user?.email}</span>
              <button type="button" onClick={handleLogout} className="header-logout">
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        {step === 'form' && (
          <FormPanel 
            form={form} 
            toggleSymptom={toggleSymptom} 
            updateForm={setForm}
            submit={submit} 
            error={error} 
          />
        )}
        {step === 'loading' && <LoadingPanel />}
        {step === 'result' && result && <ResultPanel form={form} result={result} reset={reset} />}
      </main>

      <footer className="footer">
        Démo pédagogique — Master IA 2iE — Cet outil est une aide au diagnostic, pas un avis médical. Consultez un professionnel.
      </footer>
    </div>
  )
}

function FormPanel({ form, toggleSymptom, submit, error, updateForm }) {
  const selectedCount = form.symptoms.filter((s) => s === 1).length

  return (
    <form onSubmit={submit} className="form-container">
      <div className="form-card">
        <div className="form-header">
          <h1>🔍 Diagnostic Médical</h1>
          <p>Remplissez le formulaire pour obtenir un diagnostic assisté par IA</p>
        </div>

        {/* Section Patient */}
        <section className="form-section">
          <h2>👤 Informations du patient</h2>
          <div className="form-group">
            <label htmlFor="patient_name">Nom du patient</label>
            <input
              id="patient_name"
              type="text"
              className="form-input"
              value={form.patient_name}
              onChange={(e) => updateForm({ ...form, patient_name: e.target.value })}
              placeholder="Ex. Jean Dupont"
            />
            <small>Optionnel - Pour l'historique médical</small>
          </div>
        </section>

        {/* Section Symptômes */}
        <section className="form-section">
          <div className="section-header">
            <h2>🤒 Sélectionnez vos symptômes</h2>
            <div className="counter">{selectedCount} / 17 symptômes sélectionnés</div>
          </div>

          <div className="symptoms-grid">
            {SYMPTOMS.map((symptom, index) => (
              <label 
                key={index} 
                className={`symptom-card ${form.symptoms[index] === 1 ? 'active' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={form.symptoms[index] === 1}
                  onChange={() => toggleSymptom(index)}
                  hidden
                />
                <div className="symptom-content">
                  <div className="symptom-check">
                    {form.symptoms[index] === 1 && '✓'}
                  </div>
                  <span className="symptom-label">{symptom.label}</span>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Erreur */}
        {error && (
          <div className="alert alert-error">
            ⚠️ Erreur : {error}
          </div>
        )}

        {/* Actions */}
        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={selectedCount === 0}
          >
            🔍 Analyser ({selectedCount} symptôme{selectedCount > 1 ? 's' : ''})
          </button>
          <p className="form-note">
            Sélectionnez au moins 1 symptôme pour analyser
          </p>
        </div>
      </div>
    </form>
  )
}

function LoadingPanel() {
  return (
    <div className="loading-container">
      <div className="loading-card">
        <div className="spinner" />
        <h2>Analyse en cours</h2>
        <p>Le modèle IA analyse vos symptômes pour établir un diagnostic...</p>
      </div>
    </div>
  )
}

function ResultPanel({ form, result, reset }) {
  const confidence = result.confidence ? Math.round(result.confidence * 100) : 0
  const color = DISEASE_COLORS[result.diagnosis] || '#9E9E9E'
  const confidenceStatus = confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low'

  return (
    <div className="result-container">
      <div className="result-card">
        <div className="result-header" style={{ backgroundColor: color }}>
          <div className="result-badge">✓ Diagnostic établi</div>
          <h1>Résultat de l'analyse</h1>
        </div>

        <div className="result-body">
          {/* Diagnostic Principal */}
          <div className="diagnosis-box" style={{ borderLeftColor: color }}>
            <div className="diagnosis-title">Diagnostic</div>
            <div className="diagnosis-name">{result.diagnosis}</div>
            <div className="diagnosis-confidence">
              <span>Confiance</span>
              <div className="confidence-badge" style={{ backgroundColor: color }}>
                {confidence}%
              </div>
            </div>
          </div>

          {/* Patient Info */}
          {form.patient_name && (
            <div className="info-box">
              <span className="info-label">Patient :</span>
              <span className="info-value">{form.patient_name}</span>
            </div>
          )}

          {/* Probabilités */}
          {result.proba && (
            <section className="result-section">
              <h3>📊 Probabilités par diagnostic</h3>
              <div className="proba-list">
                {result.proba.map((prob, idx) => {
                  const disease = ['Common Cold', 'Influenza', 'COVID-19', 'Bronchitis', 'Pneumonia', 'Gastroenteritis'][idx]
                  const diseaseColor = DISEASE_COLORS[disease]
                  const probPercent = Math.round(prob * 100)
                  
                  return (
                    <div key={idx} className="proba-item">
                      <div className="proba-label">
                        <span>{disease}</span>
                        <span className="proba-percent">{probPercent}%</span>
                      </div>
                      <div className="proba-bar">
                        <div 
                          className="proba-fill" 
                          style={{ 
                            width: `${probPercent}%`,
                            backgroundColor: diseaseColor
                          }} 
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Résumé Symptômes */}
          <section className="result-section">
            <h3>🤒 Symptômes détectés</h3>
            <div className="symptom-summary">
              <span className="summary-count">{form.symptoms.filter((s) => s === 1).length}</span>
              <span className="summary-text">symptômes sur 17 sélectionnés</span>
            </div>
          </section>

          {/* Recommandation */}
          <section className="result-section recommendation">
            <h3>💊 Recommandation</h3>
            <p>
              Le diagnostic suggéré est <strong>{result.diagnosis}</strong> avec une confiance de <strong>{confidence}%</strong>.
            </p>
            <div className={`confidence-indicator confidence-${confidenceStatus}`}>
              {confidenceStatus === 'high' && '✓ Résultat fiable'}
              {confidenceStatus === 'medium' && '⚠️ Résultat modéré'}
              {confidenceStatus === 'low' && '❌ Résultat peu fiable'}
            </div>
            <p className="warning-box">
              ⚠️ <strong>Important :</strong> Cet outil est une aide au diagnostic et ne remplace pas un avis médical professionnel. 
              Consultez un médecin pour une confirmation et un traitement approprié.
            </p>
          </section>
        </div>

        <div className="result-actions">
          <button onClick={reset} className="btn btn-primary">
            🔄 Nouveau diagnostic
          </button>
        </div>
      </div>
    </div>
  )
}
