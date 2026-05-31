"""Endpoints d'administration : stats agrégées et historique des diagnostics."""

from collections import Counter
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.db import get_db
from app.models.prediction import Prediction
from app.schemas import (
    AdminStats,
    PredictionHistoryItem,
    StatsDailyPoint,
    StatsKpi,
    StatsScoreBin,
    StatsStatusSlice,
)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/stats", response_model=AdminStats)
def get_stats(db: Session = Depends(get_db)) -> AdminStats:
    all_predictions = db.query(Prediction).all()
    total = len(all_predictions)

    if total == 0:
        return AdminStats(
            kpi=StatsKpi(total=0, avg_confidence=0.0, top_diagnosis="N/A", this_week=0),
            daily=[],
            score_distribution=[],
            status_breakdown=[],
        )

    # Confiances et diagnostics
    confidences = [p.confidence for p in all_predictions if p.confidence is not None]
    avg_confidence = round(sum(confidences) / len(confidences), 3) if confidences else 0.0

    # Diagnostic le plus fréquent
    diagnosis_counter = Counter(p.diagnosis for p in all_predictions)
    top_diagnosis = diagnosis_counter.most_common(1)[0][0] if diagnosis_counter else "N/A"

    one_week_ago = datetime.now(UTC) - timedelta(days=7)
    this_week = sum(1 for p in all_predictions if p.created_at and p.created_at.replace(tzinfo=UTC) > one_week_ago)

    # Daily count — 14 derniers jours
    today = datetime.now(UTC).date()
    fourteen_days_ago = today - timedelta(days=13)
    counts_by_day: dict[str, int] = {}
    for p in all_predictions:
        if p.created_at is None:
            continue
        d = p.created_at.date()
        if d < fourteen_days_ago:
            continue
        key = d.strftime("%d/%m")
        counts_by_day[key] = counts_by_day.get(key, 0) + 1
    daily = []
    for i in range(14):
        d = fourteen_days_ago + timedelta(days=i)
        key = d.strftime("%d/%m")
        daily.append(StatsDailyPoint(day=key, count=counts_by_day.get(key, 0)))

    # Confidence distribution (au lieu de score distribution)
    bins = [("0-0.2", 0, 0.2), ("0.2-0.4", 0.2, 0.4), ("0.4-0.6", 0.4, 0.6), ("0.6-0.8", 0.6, 0.8), ("0.8-1.0", 0.8, 1.01)]
    score_distribution = []
    for label, lo, hi in bins:
        n = sum(1 for c in confidences if lo <= c < hi)
        score_distribution.append(StatsScoreBin(bin=label, n=n))

    # Diagnosis breakdown
    status_breakdown = [StatsStatusSlice(name=k, value=v) for k, v in diagnosis_counter.most_common(10)]

    return AdminStats(
        kpi=StatsKpi(
            total=total,
            avg_confidence=avg_confidence,
            top_diagnosis=top_diagnosis,
            this_week=this_week,
        ),
        daily=daily,
        score_distribution=score_distribution,
        status_breakdown=status_breakdown,
    )


@router.get("/predictions", response_model=list[PredictionHistoryItem])
def list_predictions(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
) -> list[Prediction]:
    return (
        db.query(Prediction)
        .order_by(Prediction.created_at.desc())
        .limit(limit)
        .all()
    )
