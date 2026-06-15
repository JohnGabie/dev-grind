from datetime import datetime
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON
from app.db.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id       = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    baseline_done = Column(Boolean, default=False)

    # All JSON — format is intentionally flexible; the AI owns the content
    strengths      = Column(JSON, default=list)   # [{concept, evidence, observed_at}]
    gaps           = Column(JSON, default=list)   # [{concept, type, severity:1-3, evidence, last_seen}]
    level          = Column(JSON, default=dict)   # {concept: {score:0-1, attempts, last_updated}}
    style          = Column(JSON, default=dict)   # {reasoning, engagement, attention, ...}
    notes          = Column(JSON, default=list)   # [{text, category, date}]
    recommendations = Column(JSON, default=list)  # [{type, ref, reason, created_at}]

    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow)
