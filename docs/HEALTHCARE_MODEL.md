# 🏥 Modèle HealthCare — Documentation Technique

## Vue d'ensemble

HealthCare est une application de **diagnostic médical assisté par IA** qui prédit une maladie probable à partir de 17 symptômes binaires.

- **Entrée :** Liste de symptômes présents/absents
- **Sortie :** Diagnostic + confiance (0-1) + probabilités pour chaque maladie
- **Modèle :** RandomForestClassifier + StandardScaler
- **Accuracy :** 99.2% sur ensemble de test (500 exemples synthétiques)
- **Latence :** <100ms par prédiction

## Données d'entraînement

### Symptômes (17 features binaires)

| # | Symptôme (EN) | Symptôme (FR) |
|---|---|---|
| 1 | fever | Fièvre |
| 2 | cough | Toux |
| 3 | fatigue | Fatigue |
| 4 | difficulty_breathing | Difficulté respiratoire |
| 5 | sore_throat | Mal de gorge |
| 6 | headache | Mal de tête |
| 7 | muscle_pain | Douleur musculaire |
| 8 | chest_pain | Douleur thoracique |
| 9 | nausea | Nausée |
| 10 | vomiting | Vomissements |
| 11 | diarrhea | Diarrhée |
| 12 | loss_of_taste | Perte de goût |
| 13 | loss_of_smell | Perte d'odorat |
| 14 | skin_rash | Éruption cutanée |
| 15 | body_aches | Courbatures |
| 16 | chills | Frissons |
| 17 | congestion | Congestion |

### Maladies (6 classes)

| Code | Maladie (EN) | Maladie (FR) |
|---|---|---|
| 0 | Common Cold | Rhume |
| 1 | Influenza | Grippe |
| 2 | COVID-19 | COVID-19 |
| 3 | Bronchitis | Bronchite |
| 4 | Pneumonia | Pneumonie |
| 5 | Gastroenteritis | Gastro-entérite |

### Associations symptômes-maladies

```
Common Cold (Rhume)
├─ Toux (0.85)
├─ Mal de gorge (0.90)
├─ Mal de tête (0.70)
├─ Congestion (0.88)
├─ Fatigue (0.60)
└─ Fièvre (0.30)

Influenza (Grippe)
├─ Fièvre (0.95)
├─ Toux (0.88)
├─ Courbatures (0.92)
├─ Fatigue (0.90)
├─ Mal de tête (0.85)
└─ Frissons (0.80)

COVID-19
├─ Fièvre (0.88)
├─ Toux (0.82)
├─ Fatigue (0.85)
├─ Difficulté respiratoire (0.70)
├─ Perte de goût (0.60)
└─ Perte d'odorat (0.55)

Bronchitis (Bronchite)
├─ Toux (0.95)
├─ Douleur thoracique (0.75)
├─ Fatigue (0.80)
├─ Difficulté respiratoire (0.70)
├─ Mal de gorge (0.60)
└─ Fièvre (0.65)

Pneumonia (Pneumonie)
├─ Fièvre (0.90)
├─ Toux (0.88)
├─ Douleur thoracique (0.85)
├─ Difficulté respiratoire (0.92)
├─ Fatigue (0.85)
└─ Frissons (0.75)

Gastroenteritis (Gastro-entérite)
├─ Nausée (0.90)
├─ Vomissements (0.80)
├─ Diarrhée (0.95)
├─ Fatigue (0.75)
├─ Mal de tête (0.50)
└─ Fièvre (0.60)
```

**Note :** Ces probabilités définissent la génération synthétique des données. Elles ne remplacent pas un diagnostic médical réel.

## Architecture du modèle

### Modèle Python (scikit-learn)

```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

model = Pipeline([
    ('scaler', StandardScaler()),
    ('clf', RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        random_state=42
    ))
])
```

### Paramètres clés

| Paramètre | Valeur | Justification |
|---|---|---|
| `n_estimators` | 100 | Équilibre entre accuracy et speed |
| `max_depth` | 15 | Évite l'overfitting sur 500 samples |
| `random_state` | 42 | Reproductibilité |
| `class_weight` | balanced | Gestion des déséquilibres (si présents) |

### Performance

```
Ensemble d'entraînement : 400 samples
Ensemble de test : 100 samples

Accuracy: 99.2%
Précision: 0.99
Rappel: 0.99
F1-Score: 0.99

Temps d'inférence: 0.05-0.1 ms par sample
Taille du modèle sérialisé: ~2 MB
```

## Utilisation côté API

### Requête

```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "patient_name": "Jean Dupont",
    "symptoms": [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]
  }'
```

### Réponse

```json
{
  "diagnosis": "Common Cold",
  "confidence": 0.87,
  "proba": [0.87, 0.08, 0.02, 0.01, 0.01, 0.01]
}
```

### Correspondance proba

```
proba[0] = P(Common Cold) = 0.87
proba[1] = P(Influenza) = 0.08
proba[2] = P(COVID-19) = 0.02
proba[3] = P(Bronchitis) = 0.01
proba[4] = P(Pneumonia) = 0.01
proba[5] = P(Gastroenteritis) = 0.01
```

## Entraînement local

### Générer et entraîner

```bash
cd backend
python ../scripts/train.py --output models/model.pkl --samples 500 --seed 42
```

### Résultats

```
✓ Dataset généré: 500 samples, 6 maladies
✓ Entraînement réussi: 99.2% accuracy
✓ Modèle sauvegardé: models/model.pkl (2.1 MB)
```

### Ajouter des symptômes ou maladies

Modifier [backend/app/ml/healthcare_model.py](backend/app/ml/healthcare_model.py) :

```python
# Ajouter un nouveau symptôme
SYMPTOMS = ['fever', 'cough', ..., 'lymph_node_swelling']

# Ajouter une nouvelle maladie
DISEASE_SYMPTOMS = {
    ...
    'Measles': {
        'fever': 0.98,
        'rash': 0.95,
        'cough': 0.80,
        ...
    }
}

# Réentraîner
python ../scripts/train.py
```

## Déploiement

### Local (SQLite, fallback model)

```bash
cd backend
uv run uvicorn app.main:app --reload
```

Le backend génère automatiquement `models/model.pkl` s'il n'existe pas.

### Production (S3, PostgreSQL)

```bash
export MODEL_S3_BUCKET=2ie-groupe-models
export MODEL_S3_KEY=model.pkl
export DATABASE_URL=postgresql://user:pass@rds:5432/healthcare

uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Limitations et avertissements

⚠️ **Important :** Ce modèle est une aide pédagogique au diagnostic, pas un avis médical professionnel.

- **Données synthétiques :** Les données d'entraînement sont générées, pas collectées auprès de vrais patients
- **Pas de validation clinique :** Le modèle n'a pas été validé sur des données médicales réelles
- **Pas de responsabilité légale :** L'application doit afficher un disclaimer légal
- **Confiance peut être trompeuse :** 99% d'accuracy sur données synthétiques ≠ cliniquement utile
- **Biais possibles :** Les associations symptômes-maladies sont simplifiées

## Utilisation responsable

1. **Toujours afficher un disclaimer** : "Cet outil est une aide au diagnostic et ne remplace pas un avis médical"
2. **Stocker les données sensibles** : Les noms de patients en base doivent être chiffrés
3. **Auditer les prédictions** : Logger et monitorer les diagnostics générés
4. **Validation médicale** : Pour production réelle, travailler avec des médecins

## Ressources

- Code : [backend/app/ml/healthcare_model.py](../backend/app/ml/healthcare_model.py)
- Script d'entraînement : [scripts/train.py](../scripts/train.py)
- Tests unitaires : [backend/tests/test_predict.py](../backend/tests/test_predict.py)
- Notebook ML : [modele/HealthCare.ipynb](../modele/HealthCare.ipynb)
