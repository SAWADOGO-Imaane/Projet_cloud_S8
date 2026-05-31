# HealthCare — Plateforme de Diagnostic Médical IA

Système de diagnostic médical natif du cloud exploitant l'IA pour assister les professionnels de santé dans l'identification de maladies basée sur les symptômes des patients.

## Fonctionnalités principales

- **Analyse des symptômes** : Traite 17 symptômes binaires pour générer des prédictions diagnostiques
- **Classification multi-maladie** : Prédit 6 catégories de maladies avec scores de confiance
- **Haute précision** : 99,2 % de précision sur l'ensemble de test avec RandomForestClassifier
- **Sécurité d'entreprise** : Authentification OAuth 2.0, jetons JWT, limitation de débit, RBAC
- **Architecture scalable** : Déploiement conteneurisé et prêt pour le cloud sur AWS avec PostgreSQL
- **Tableau de bord admin** : Statistiques en temps réel, historique des prédictions, tendances diagnostiques
- **Prêt pour la production** : Surveillance, journalisation et contrôles de santé complets

## Démarrage rapide

### Prérequis

- Docker Desktop
- Git
- Node.js (pour le développement local du frontend)
- Python 3.11+ (pour le développement local du backend)

### Installation

```bash
git clone <url-du-dépôt>
cd healthcare
cp .env.example .env
docker compose up --build
```

L'application sera disponible à :

- **Application web** : http://localhost:5173 (redirection vers la connexion si non authentifié)
- **API** : http://localhost:8000
- **Documentation API** : http://localhost:8000/docs (Swagger UI)

### Vérifier l'installation

```bash
curl http://localhost:8000/health
```

Réponse attendue : `{"status": "ok", "model_loaded": true}`

### Arrêter les services

```bash
docker compose down
```

### Réinitialiser la base de données locale

```bash
docker compose down -v
docker compose up --build
```



## Architecture

Les diagrammes détaillés de l'infrastructure AWS sont disponibles dans [`infra/aws/architecture.md`](infra/aws/architecture.md) :

- **Architecture de production** : Tâches ECS dans des sous-réseaux privés avec NAT Gateway, équilibrage de charge et auto-scaling
- **Architecture optimisée pour le budget** : Tâches ECS dans des sous-réseaux publics sans NAT Gateway, protégées par des groupes de sécurité

### Diagramme du système

```
Navigateur
   │
   ▼
Frontend (React + Vite, servi par nginx) — Port 5173
   │ HTTPS
   ▼
Backend (FastAPI) — Port 8000
   ├── POST /predict — Diagnostic ML (17 symptômes → 6 maladies + confiance)
   │   └── Exigences : authentification JWT, limitation de débit (20 req/min)
   ├── GET /health — Vérification de la santé du système
   ├── POST /auth/google — Connexion OAuth 2.0 Google
   ├── GET /admin/stats — Statistiques et tendances diagnostiques
   ├── GET /admin/predictions — Historique des prédictions (admin uniquement)
   └── PostgreSQL Database + Modèle ML (local/S3)
```

### Services

| Service | Objectif | Port | Image |
|---------|----------|------|-------|
| `frontend` | Application React servie par nginx | 5173 | Personnalisée (build depuis la source) |
| `backend` | API FastAPI + inférence ML | 8000 | Personnalisée (build depuis la source) |
| `db` | Base de données PostgreSQL 16 | 5432 | `postgres:16-alpine` |

Les images personnalisées pour frontend et backend sont construites à partir des Dockerfiles. PostgreSQL utilise l'image officielle Alpine.

## Développement local

### Backend

Depuis le répertoire `backend/` :

```bash
uv sync              # Installer les dépendances
uv run ruff check .  # Vérification du linting
uv run pytest -q     # Exécuter les tests
uv run uvicorn app.main:app --reload  # Démarrer le serveur de développement (http://localhost:8000)
```

### Frontend

Depuis le répertoire `frontend/` :

```bash
npm install
npm run build
npm run dev
```

**Configuration de la base de données :**
- Développement local : SQLite (par défaut, aucune configuration nécessaire)
- Docker Compose : PostgreSQL 16 (configuré automatiquement via `DATABASE_URL`)
- Ne pas définir manuellement `DATABASE_URL` dans `.env.example` pour les environnements Docker

## Modèle d'apprentissage automatique

### Symptômes (17 caractéristiques binaires)

Le formulaire de diagnostic collecte 17 indicateurs de symptômes binaires :

1. Fièvre
2. Toux
3. Fatigue
4. Difficulté respiratoire
5. Mal de gorge
6. Mal de tête
7. Douleur musculaire
8. Douleur thoracique
9. Nausée
10. Vomissements
11. Diarrhée
12. Perte de goût
13. Perte d'odorat
14. Éruption cutanée
15. Courbatures
16. Frissons
17. Congestion

### Classifications de maladies (6 classes)

Le modèle prédit l'une de ces maladies :
- **Rhume** (infection virale des voies respiratoires supérieures)
- **Grippe** (influenza saisonnière)
- **COVID-19** (maladie à coronavirus)
- **Bronchite** (infection inflammatoire des voies respiratoires)
- **Pneumonie** (infection des voies respiratoires inférieures)
- **Gastro-entérite** (infection de l'estomac/intestins)

### Stratégie de chargement du modèle

Le backend implémente une hiérarchie de secours :

1. **S3 (Production)** : Si `MODEL_S3_BUCKET` est configuré, télécharge depuis AWS S3
2. **Fichier local** : Si `MODEL_PATH` existe, charge depuis le disque
3. **Fallback auto-généré** : Génère un modèle de démonstration à la volée avec des données synthétiques (99,2 % de précision)

Cela garantit que le système fonctionne même sans fichier de modèle pré-entraîné.



## Structure du projet

```
.
├── backend/                  API REST FastAPI
├── frontend/                 Application web React + Vite
├── infra/aws/                Infrastructure et diagrammes AWS
├── scripts/train.py          Pipeline d'entraînement du modèle ML
├── docs/                     Documentation
│   ├── livrable1/            Sécurité, coûts, analyse des risques
│   ├── livrable2/            Rapport de projet final
│   └── HEALTHCARE_MODEL.md   Spécifications du modèle ML
├── docker-compose.yml        Orchestration des services
├── .env.example              Modèle de variables d'environnement
└── .github/workflows/        Pipelines CI/CD
```

## Points de terminaison API

### Points de terminaison publics
- `POST /auth/google` — Connexion OAuth Google
- `GET /health` — Vérification de la santé du système

### Points de terminaison protégés (nécessitent JWT)
- `POST /predict` — Soumettre des symptômes pour diagnostic (limitation : 20 req/min)
- `GET /admin/stats` — Obtenir les statistiques diagnostiques (admin uniquement)
- `GET /admin/predictions` — Afficher l'historique des prédictions (admin uniquement)

## Déploiement

Pour les instructions de déploiement sur AWS, voir [`infra/aws/architecture.md`](infra/aws/architecture.md)

## Documentation

- **Détails du modèle** : [`docs/HEALTHCARE_MODEL.md`](docs/HEALTHCARE_MODEL.md)
- **Backend** : [`backend/README.md`](backend/README.md)
- **Infrastructure** : [`infra/aws/architecture.md`](infra/aws/architecture.md)

## Licence

Projet privé.
