from sqlalchemy import JSON, Column, DateTime, Float, Integer, String, func

from app.db import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True)
    patient_name = Column(String(255), nullable=True)
    symptoms = Column(JSON, nullable=False)
    diagnosis = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=True)
    proba = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
