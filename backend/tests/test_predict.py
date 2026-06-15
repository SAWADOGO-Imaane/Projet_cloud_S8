from fastapi.testclient import TestClient

from app.auth import create_jwt
from app.db import SessionLocal
from app.main import app
from app.models.user import User

# 17 symptômes binaires (0 ou 1)
SYMPTOMS = [1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]


def auth_headers() -> dict[str, str]:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "agent@example.test").first()
        if user is None:
            user = User(
                google_sub="agent-test-sub",
                email="agent@example.test",
                name="Agent Test",
                role="user",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return {"Authorization": f"Bearer {create_jwt(user)}"}
    finally:
        db.close()


def test_predict_requires_authentication():
    """Le formulaire de diagnostic est privé : un JWT applicatif est requis."""
    with TestClient(app) as client:
        r = client.post("/predict", json={"symptoms": SYMPTOMS})
        assert r.status_code == 401


def test_api_prefixed_predict_requires_authentication():
    """Le prefixe /api doit atteindre la meme route que /predict."""
    with TestClient(app) as client:
        r = client.post("/api/predict", json={"symptoms": SYMPTOMS})
        assert r.status_code == 401


def test_predict_healthcare_fallback():
    """Vérifie le fallback HealthCare avec les 17 symptômes."""
    with TestClient(app) as client:
        r = client.post("/predict", json={"symptoms": SYMPTOMS}, headers=auth_headers())
        assert r.status_code == 200
        body = r.json()
        assert body["diagnosis"] in {"Common Cold", "Influenza", "COVID-19", "Bronchitis", "Pneumonia", "Gastroenteritis"}
        assert 0 <= body["confidence"] <= 1 if body["confidence"] else True
        assert len(body["proba"]) == 6


def test_predict_rejects_wrong_symptom_count():
    """Le backend renvoie 400 si le modèle refuse l'input (mauvaise shape)."""
    with TestClient(app) as client:
        r = client.post("/predict", json={"symptoms": [1, 0, 1]}, headers=auth_headers())
        assert r.status_code == 422


def test_predict_rejects_empty_symptoms():
    """Schéma Pydantic : symptoms doit avoir exactement 17 éléments."""
    with TestClient(app) as client:
        r = client.post("/predict", json={"symptoms": []}, headers=auth_headers())
        assert r.status_code == 422


def test_predict_rate_limit():
    """Au-delà de 20 requêtes/minute depuis la même IP, le endpoint renvoie 429.

    Mesure anti model stealing : limite le clonage du modèle par requêtes massives.
    """
    with TestClient(app) as client:
        headers = auth_headers()
        statuses = [client.post("/predict", json={"symptoms": SYMPTOMS}, headers=headers).status_code for _ in range(25)]
        assert 429 in statuses, "Le rate limit aurait dû déclencher un 429"
