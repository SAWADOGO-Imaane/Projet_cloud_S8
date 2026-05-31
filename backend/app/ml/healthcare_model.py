"""Modèle HealthCare pour diagnostic de maladies basé sur les symptômes."""

from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

# Liste des symptômes supportés
SYMPTOM_NAMES = [
    "fever",
    "cough",
    "fatigue",
    "difficulty_breathing",
    "sore_throat",
    "headache",
    "muscle_pain",
    "chest_pain",
    "nausea",
    "vomiting",
    "diarrhea",
    "loss_of_taste",
    "loss_of_smell",
    "skin_rash",
    "body_aches",
    "chills",
    "congestion",
]

# Labels des maladies prédites par le modèle
DISEASE_LABELS = [
    "Common Cold",
    "Influenza",
    "COVID-19",
    "Bronchitis",
    "Pneumonia",
    "Gastroenteritis",
]

EXPECTED_FEATURE_COUNT = len(SYMPTOM_NAMES)


def generate_training_data(n_samples: int = 500, seed: int = 42) -> tuple[list[list[float]], list[int]]:
    """Génère un jeu d'exemple pour la démo HealthCare."""
    import random
    random.seed(seed)
    
    X: list[list[float]] = []
    y: list[int] = []
    
    # Définir les patterns de symptômes associés à chaque maladie
    disease_patterns = {
        0: [0, 1, 2],  # Common Cold: fever, cough, fatigue
        1: [0, 1, 2, 6, 15],  # Influenza: fever, cough, fatigue, muscle_pain, chills
        2: [0, 1, 2, 3, 4, 12, 13],  # COVID-19: fever, cough, fatigue, difficulty_breathing, sore_throat, loss_of_taste, loss_of_smell
        3: [1, 2, 3, 7],  # Bronchitis: cough, fatigue, difficulty_breathing, chest_pain
        4: [0, 1, 2, 3, 7, 8],  # Pneumonia: fever, cough, fatigue, difficulty_breathing, chest_pain, nausea
        5: [8, 9, 10],  # Gastroenteritis: nausea, vomiting, diarrhea
    }
    
    for _ in range(n_samples):
        disease = random.randint(0, len(DISEASE_LABELS) - 1)
        symptoms = [0] * EXPECTED_FEATURE_COUNT
        
        # Ajouter les symptômes caractéristiques
        for idx in disease_patterns[disease]:
            symptoms[idx] = 1
        
        # Ajouter du bruit (symptômes supplémentaires aléatoires)
        for i in range(EXPECTED_FEATURE_COUNT):
            if random.random() < 0.15:  # 15% de probabilité d'ajouter un symptôme supplémentaire
                symptoms[i] = 1
        
        X.append(symptoms)
        y.append(disease)
    
    return X, y


def train_healthcare_model(n_samples: int = 500, seed: int = 42):
    """Entraîne un classifieur pour la détection de maladies."""
    X, y = generate_training_data(n_samples=n_samples, seed=seed)
    model = make_pipeline(
        StandardScaler(),
        RandomForestClassifier(n_estimators=100, max_depth=10, random_state=seed),
    )
    model.fit(X, y)
    return model
