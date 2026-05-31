from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ItemIn(BaseModel):
    label: str = Field(..., min_length=1, max_length=255)
    value: float


class ItemOut(ItemIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class PredictIn(BaseModel):
    """Entrée pour /predict.

    Symptoms: liste binaire des symptômes (0 ou 1 pour chaque symptôme)
    patient_name: nom du patient (optionnel pour l'admin dashboard)
    """

    symptoms: list[int] = Field(..., min_length=17, max_length=17)
    patient_name: str | None = None


class PredictOut(BaseModel):
    diagnosis: str
    confidence: float | None = None
    proba: list[float] | None = None
    id: int | None = None


class PredictionHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_name: str | None = None
    diagnosis: str
    confidence: float | None = None
    created_at: datetime


class StatsKpi(BaseModel):
    total: int
    avg_confidence: float
    top_diagnosis: str
    this_week: int


class StatsDailyPoint(BaseModel):
    day: str
    count: int


class StatsScoreBin(BaseModel):
    bin: str
    n: int


class StatsStatusSlice(BaseModel):
    name: str
    value: int


class AdminStats(BaseModel):
    kpi: StatsKpi
    daily: list[StatsDailyPoint]
    score_distribution: list[StatsScoreBin]
    status_breakdown: list[StatsStatusSlice]
