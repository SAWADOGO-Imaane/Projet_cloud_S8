# RAPPORT LIVRABLE 1 — Plan de sécurité et budget

**HealthCare — Plateforme de Diagnostic Médical IA**

**ECUE2 — Planification**

**Date :** Mai 2026

---

## 1. Présentation du projet

### Problème résolu

HealthCare adresse le besoin d'un **diagnostic médical assisté par IA** pour réduire les délais d'attente aux urgences et fournir une première évaluation rapide avant la consultation d'un médecin.

### Utilisateurs visés

- **Infirmiers** des urgences (triage rapide)
- **Patients** en auto-diagnostic
- **Administrateurs** pour suivi statistique et historique des diagnostics

### Modèle ML

- **Type :** RandomForestClassifier (scikit-learn)
- **Entrées :** 17 symptômes binaires
  - Fièvre, toux, fatigue, difficultés respiratoires, mal de gorge
  - Mal de tête, douleurs musculaires, douleur thoracique
  - Nausées, vomissements, diarrhée, perte de goût/odorat
  - Éruption cutanée, douleurs corporelles, frissons, congestion
- **Sorties :** 6 classes de maladies
  - Rhume, Grippe, COVID-19, Bronchite, Pneumonie, Gastro-entérite
- **Performance :** 99,2 % de précision sur ~500 exemples d'entraînement
- **Latence d'inférence :** <100 ms par diagnostic
- **Taille modèle :** 2,1 MB

### Plateforme cloud cible

**AWS** (Amazon Web Services) pour :
- **ECS Fargate** : conteneurs serverless sans gestion infra
- **RDS PostgreSQL** : base de données relationnelle managée
- **S3** : stockage du modèle ML et assets frontend
- **CloudFront** : CDN pour frontend (optionnel)
- **CloudWatch** : logs et monitoring
- **Application Load Balancer (ALB)** : HTTPS + routage

**Justification :**
- Service gratuit pendant 12 mois (compte nouveau)
- Coût prévisible et transparent
- Scaling automatique pour pics d'utilisation
- Conformité GDPR possible avec RDS chiffré

---

## 2. Schéma d'architecture prévue

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet public (HTTPS)                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Application Load Balancer (ALB)
                    (Port 443 HTTPS, port 80 redir)
                              ↓
            ┌─────────────────────────────────────┐
            │   VPC 10.0.0.0/16                   │
            │   ┌──────────┐   ┌──────────────┐   │
            │   │ Frontend │   │  Backend API │   │
            │   │  Fargate │   │   Fargate    │   │
            │   │ :5173    │   │   :8000      │   │
            │   └──────────┘   └──────────────┘   │
            │                         ↓            │
            │                  ┌─────────────┐    │
            │                  │  PostgreSQL │    │
            │                  │   RDS      │    │
            │                  │  :5432     │    │
            │                  │ (Private)  │    │
            │                  └─────────────┘    │
            │                         ↑           │
            │                         │           │
            │                    ┌────────┐       │
            │                    │ Modèle │       │
            │                    │   ML   │       │
            │                    │ (S3)   │       │
            │                    └────────┘       │
            └─────────────────────────────────────┘
                              ↓
                   CloudWatch Logs + Metrics
```

### Services

| Service           | Rôle                              | Public/Privé | Port |
|-------------------|-----------------------------------|--------------|------|
| Frontend (React)  | Interface utilisateur web         | Public       | 443  |
| Backend (FastAPI)| API REST, inférence ML, auth     | Privé        | 8000 |
| PostgreSQL        | Stockage utilisateurs, requêtes  | Privé        | 5432 |
| Modèle ML (S3)    | RandomForest sérialisé (.pkl)    | Privé        | -    |
| ALB               | Routage HTTPS + health checks    | Public       | 443  |
| CloudWatch        | Logs, métriques, alarmes         | Privé        | -    |

### Flux de données

1. **Authentification :**
   - Utilisateur → Google OAuth → Backend → JWT token → Frontend
2. **Prédiction :**
   - Frontend (17 symptômes) → Backend → Modèle ML → Diagnostic + confiance → BD → Frontend
3. **Admin :**
   - Admin → Dashboard → Backend /admin/stats → KPIs + graphiques
   - Admin → Historique → Backend /admin/predictions → Tableau complet

---

## 3. Analyse de risques

| # | Risque                                  | Impact   | Probabilité | Mesure prévue                                |
|---|----------------------------------------|----------|-------------|---------------------------------------------|
| 1 | Fuite de secrets en repo GitHub        | **Élevé**| Moyenne    | `.gitignore` strict, trufflehog en CI      |
| 2 | Injection SQL                          | **Élevé**| Faible     | SQLAlchemy ORM + validation Pydantic        |
| 3 | Accès non autorisé à l'API             | **Élevé**| Moyenne    | JWT + `require_admin`, rate-limit 20 req/min|
| 4 | Image Docker vulnérable                | Moyen    | Élevée     | Scan Trivy en CI, image python:3.11-slim   |
| 5 | Coût cloud qui dérape                  | Moyen    | Faible     | Budget alert AWS CloudWatch (~$50/mois)    |
| 6 | Diagnostic médical incorrect           | **Élevé**| Moyenne    | Disclaimer légal, validation entrée, logs  |
| 7 | Données patient exposées (GDPR)        | **Élevé**| Faible     | Chiffr. RDS, pas de PII en logs, retention |
| 8 | Credentials AWS compromise             | **Élevé**| Faible     | GitHub Secrets, IAM minimal, key rotation  |
| 9 | Downtime (crash backend)               | Moyen    | Faible     | ALB health checks 30s, auto-restart        |
| 10| DDoS                                    | Moyen    | Très faible| ALB + WAF optionnel, rate-limit client     |

### Détail des mesures clés

**Mesure 1 — Secrets protégés :**
```
❌ NE PAS écrire : GOOGLE_CLIENT_SECRET=xyz dans le code
✅ UTILISER : GitHub Secrets → Variables d'env Fargate → Code lit from os.getenv()
```

**Mesure 2 — Injection SQL :**
```
❌ NE PAS faire : db.execute(f"SELECT * FROM users WHERE id = {id}")
✅ UTILISER : db.query(User).filter(User.id == id).first()  # SQLAlchemy paramétrisé
```

**Mesure 3 — Rate-limit :**
```
POST /predict : 20 requêtes / minute par IP
→ Évite spam, abuse ML, surcharge coûts AWS
```

**Mesure 4 — Disclaimer médical :**
```
"HealthCare est un outil d'assistance. Il ne remplace pas un diagnostic médical professionnel.
Consultez un médecin pour toute décision médicale."
```

**Mesure 5 — Audit & Logs :**
```
✅ Logger : user_id, endpoint, timestamp, paramètres (anonymisés)
❌ Ne JAMAIS logger : symptoms détaillées, JWT tokens
→ CloudWatch retention : 7 jours
```

---

## 4. Gestion des accès (IAM)

### Rôles applicatifs

| Rôle          | Permissions                                  | Exemples d'utilisateurs     |
|---------------|----------------------------------------------|---------------------------|
| **admin**     | GET /admin/stats, GET /admin/predictions    | Responsable urgences      |
| **user**      | POST /predict, GET /health                   | Patients, infirmiers      |
| **anonymous** | GET /health uniquement                       | Monitoring externe        |

### Configuration

**Frontend :**
- JWT token stocké en localStorage avec clé `healthcare_token`
- Vérification rôle avant accès /admin
- Redirect vers /login si non authentifié

**Backend :**
- Variable d'env `ADMIN_EMAILS` : emails ayant le rôle admin
- Exemple :
  ```bash
  ADMIN_EMAILS=medecin@urgences.com,responsable@hopital.fr
  ```
- Route POST /auth/google : crée/met à jour user + génère JWT avec rôle

### Secrets stockés

| Secret                 | Où stocké               | Rotation | Accès       |
|------------------------|-------------------------|----------|------------|
| GOOGLE_CLIENT_ID       | GitHub Secrets + .env   | 12 mois  | Frontend   |
| GOOGLE_CLIENT_SECRET   | GitHub Secrets seul     | 12 mois  | Backend    |
| JWT_SECRET            | GitHub Secrets + Fargate| 6 mois   | Backend    |
| DATABASE_URL          | GitHub Secrets + Fargate| N/A      | Backend    |
| AWS_ACCESS_KEY_ID     | GitHub Secrets          | 6 mois   | CI/CD      |
| AWS_SECRET_ACCESS_KEY | GitHub Secrets          | 6 mois   | CI/CD      |

**Principe du moindre privilège :**
- Frontend ne connaît pas JWT_SECRET ni DATABASE_URL
- Backend ne connaît pas GOOGLE_CLIENT_SECRET avant envoi API (recours utilisé)
- CI/CD user possède permissions : EC2, ECR, CloudWatch (rien d'autre)

---

## 5. Estimation des coûts (12 mois)

### Hypothèses

- **Utilisateurs/mois :** 100
- **Diagnostics/mois :** 300 (~10/jour)
- **Rétention données :** 1 an (365 jours)
- **Pics :** 5× charge moyenne
- **Frontend :** servi via S3 + CloudFront
- **Modèle ML :** 2,1 MB, chargé en mémoire à démarrage

### Estimation détaillée

| Poste                       | Service                  | Config               | Coût unitaire | Qty  | Coût mensuel |
|-----------------------------|--------------------------|----------------------|---------------|------|------------|
| **Compute**                 |                          |                      |               |      |            |
| Backend API                 | ECS Fargate              | 0.25 vCPU, 512MB RAM | 0,01312 $/h   | 730h | 9,59 $    |
| **Base de données**         |                          |                      |               |      |            |
| RDS PostgreSQL              | db.t3.micro              | 1 GB storage         | 0,015 $/h     | 730h | 10,95 $   |
| Storage RDS                 | Backup inclus            | 1 GB × 365 j (1 an)  | 0,23 $/GB/mo  | 1    | 0,23 $    |
| **Stockage objet**          |                          |                      |               |      |            |
| S3 (modèle ML)              | S3 Standard              | 2,1 MB modèle        | 0,023 $/GB/mo | 0,0021 | ~0 $    |
| **Réseau**                  |                          |                      |               |      |            |
| ALB (Application LB)        | ALB                      | 1 LB                 | 0,0225 $/h    | 730h | 16,43 $   |
| Transfer data out (frontend)| CloudFront               | ~50 MB/mois          | 0,085 $/GB    | 0,05 | 4,25 $    |
| **Logs & Monitoring**       |                          |                      |               |      |            |
| CloudWatch Logs             | Ingestion                | ~10 GB/mois          | 0,50 $/GB     | 10   | 5 $       |
| CloudWatch Monitoring       | Alarmes, dashboards      | Gratuit (5 métriques)|                |      | 0 $       |
| **Divers**                  |                          |                      |               |      |            |
| Domaine DNS (optionnel)     | Route53                  | Enregistrement        | 0,50 $        | 1    | 0,50 $    |
| Certificat SSL              | ACM (gratuit)            | Inclus ALB           |               |      | 0 $       |
| **TOTAL / mois**            |                          |                      |               |      | **46,95 $**|

### Coûts annuels

| Catégorie        | Coût mensuel | Coût annuel | Remarques                 |
|------------------|-------------|-----------|--------------------------|
| Production       | 46,95 $     | 563 $     | Hypothèses nominales      |
| Développement    | 5 $         | 60 $      | Instance t3.micro partagée|
| Pics (5×)        | 234,75 $    | 2 818 $   | Si 500 diag/jour pendant 1 mois |
| **Budget safe**  | 50 $ / mois | **600 $/an** | Avec marge de sécurité    |

### Optimisations possibles (coût → ~$20/mois)

- Remplacer RDS par Aurora Serverless (pay-per-use)
- Frontend + modèle ML en S3 seul (sans Fargate backend)
- Utiliser Lambda pour inférence au lieu de Fargate (250 GB-secondes gratuites)

---

## 6. Plan de mise en œuvre

### Checklist sécurité ECUE1

- [x] **`.gitignore`** : exclusion `.env`, `*.pem`, `node_modules/`, `__pycache__/`
- [x] **`.env.example`** : template avec placeholders (sans valeurs)
- [x] **Trufflehog CI** : détecte secrets dans chaque push
- [x] **pip-audit CI** : vérifie vulnérabilités packages Python
- [x] **Trivy CI** : scan image Docker avant push
- [x] **HTTPS production** : Certificate AWS ACM (gratuit)
- [x] **Authentification API** : JWT + Google OAuth
- [x] **Rate-limit** : 20 req/min POST /predict
- [x] **CORS** : frontend domain uniquement
- [x] **CloudWatch Logs** : retention 7 jours
- [x] **Alarme budget** : alert si > 50 $/mois
- [x] **Tests unitaires** : 80%+ coverage
- [x] **Docker Compose** : reproductibilité locale
- [x] **GitHub Actions** : CI/CD automatisé

### Calendrier approximatif

| Phase       | Durée | Tâches                                           |
|-------------|-------|------------------------------------------------|
| **Semaine 1** | 5j   | Setup AWS, GitHub Actions, secrets              |
| **Semaine 2** | 5j   | Développement backend + frontend                |
| **Semaine 3** | 5j   | Tests, scans CI, optimisations                  |
| **Semaine 4** | 5j   | Déploiement Fargate, soutenance finale          |

---

## Annexe — Références

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [AWS Well-Architected Security Pillar](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/)
- [FDA AI/ML Guidance](https://www.fda.gov/medical-devices/software-related-medical-device-cybersecurity/)
- [GDPR Compliance Checklist](https://gdpr-info.eu/)

---

**Signature :** Équipe HealthCare  
**Date :** Mai 2026
