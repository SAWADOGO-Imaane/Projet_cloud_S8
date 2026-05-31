# Architecture AWS — Deux Variantes de Déploiement

Ce dossier contient deux schémas `.drawio` (ouvrables sur [app.diagrams.net](https://app.diagrams.net)) représentant les deux approches de déploiement :

| Fichier | Variante | Caractéristiques |
|---|---|---|
| `architecture.drawio` | **Production** | Tâches ECS en subnet privé, NAT Gateway, deux couches de sécurité réseau (routage + Security Groups) |
| `architecture-budget.drawio` | **Optimisée** | Tâches ECS en subnet public, pas de NAT Gateway, une seule couche de sécurité (Security Groups uniquement) |

Le choix entre les deux dépend des priorités : **sécurité maximale** vs **réduction des coûts**.

---

## Le point commun aux deux

- L'**ALB** est dans le subnet **public** — c'est la porte d'entrée HTTPS.
- **RDS PostgreSQL** est dans le subnet **privé** — une base de données n'est
  jamais joignable depuis Internet, dans aucune des deux variantes.
- Les **Security Groups** en cascade : `alb-sg` (443 depuis tout) →
  `backend-sg` (8000 depuis `alb-sg`) → `db-sg` (5432 depuis `backend-sg`).
- Services hors VPC : **ECR** (images), **S3** (modèle ML), **CloudWatch** (logs).

## Ce qui change : où sont les tâches ECS

### Variante référence (`architecture.drawio`)

Les tâches ECS (frontend + backend) sont dans le **subnet privé**.

- Sécurité maximale : les conteneurs ne sont pas routables depuis Internet,
  même si un Security Group était mal configuré.
- **Mais** : une tâche Fargate en subnet privé doit télécharger son image
  depuis ECR. Sans route Internet, il faut un **NAT Gateway**.
- Coût du NAT Gateway : **~32 $/mois**, fixe, facturé même au repos.

C'est l'architecture recommandée pour les environnements de production réels.

### Variante budget (`architecture-budget.drawio`)

Les tâches ECS (frontend + backend) sont dans le **subnet public**, avec une
IP publique.

- La tâche tire son image ECR directement via l'Internet Gateway : **0 $ de NAT**.
- La protection repose **entièrement sur les Security Groups** : `backend-sg`
  n'autorise le port 8000 que depuis `alb-sg`. Le conteneur a beau être
  routable, tout trafic non autorisé est jeté.
- Une seule couche de défense au lieu de deux. Cette approche réduit les coûts
  infrastructure tout en conservant une posture sécurité acceptable si les
  Security Groups sont correctement configurés et audités régulièrement.

C'est l'approche pragmatique pour les projets avec des contraintes budgétaires, tout en maintenant la sécurité via Security Groups appropriés.

---

## Le piège à éviter

Mettre **le frontend en public et le backend en privé** est le pire choix :
on paie quand même le NAT Gateway (à cause du backend privé) ET on a une
tâche exposée. Les deux variantes ci-dessus sont cohérentes ; ce mélange ne
l'est pas.

## Rappel conceptuel

« Subnet public » ne veut pas dire « contenu public ». Le contenu du frontend
est public (tout le monde voit l'app React), mais ça ne détermine pas son
subnet. Le subnet répond à une seule question : *cette ressource a-t-elle une
route directe vers l'Internet Gateway ?* Le frontend, derrière l'ALB, n'en a
pas besoin — sauf pour la raison de coût expliquée plus haut.

## Comparatif

| Critère | Référence | Budget |
|---|---|---|
| Tâches ECS | Subnet privé | Subnet public + IP publique |
| NAT Gateway | Oui | Non |
| Coût mensuel NAT | ~32 $ | 0 $ |
| Couches de défense réseau | 2 (routage + SG) | 1 (SG uniquement) |
| RDS | Subnet privé | Subnet privé |
| Recommandé pour | Environnement de production | Déploiement avec contraintes budgétaires |
