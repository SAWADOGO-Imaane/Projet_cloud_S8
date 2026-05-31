"""Endpoint d'inférence pour diagnostic HealthCare.

Utilise le modèle XGBoost pour prédire le diagnostic basé sur les symptômes.
Persiste chaque diagnostic en base pour l'admin dashboard.

Rate limiting : /predict est plafonné par IP pour limiter le model stealing
(clonage du modèle par envoi massif de requêtes).
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.ml.healthcare_model import DISEASE_LABELS
from app.models.prediction import Prediction
from app.models.user import User
from app.ratelimit import limiter
from app.schemas import PredictIn, PredictOut

router = APIRouter(prefix="/predict", tags=["ml"])


@router.post("", response_model=PredictOut)
@limiter.limit("20/minute")
def predict(
    payload: PredictIn,
    request: Request,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> PredictOut:
    model = request.app.state.model

    try:
        X = [payload.symptoms]
        proba_list: list[float] | None = None
        confidence: float | None = None

        # Prédiction avec le modèle
        pred_idx = model.predict(X)[0]
        diagnosis = DISEASE_LABELS[pred_idx] if pred_idx < len(DISEASE_LABELS) else f"Diagnosis_{pred_idx}"
        
        # Obtenir les probabilités si disponibles
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(X)[0]
            proba_list = proba.tolist()
            confidence = float(proba[pred_idx])  # Confiance = proba de la classe prédite

    except (ValueError, IndexError) as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Le modèle a refusé l'input : {exc}. Vérifiez le nombre de symptômes (17 requis).",
        ) from exc

    record = Prediction(
        patient_name=payload.patient_name,
        symptoms=payload.symptoms,
        diagnosis=diagnosis,
        confidence=confidence,
        proba=proba_list,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return PredictOut(
        diagnosis=diagnosis,
        confidence=confidence,
        proba=proba_list,
        id=record.id,
    )
