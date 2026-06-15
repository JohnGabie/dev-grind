from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON, Boolean
from app.db.database import Base
import uuid


class Course(Base):
    __tablename__ = "courses"

    id          = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id     = Column(String, ForeignKey("users.id"), nullable=False)
    title       = Column(String(120), nullable=False)
    book_slug   = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    modules     = Column(JSON, default=list)  # [{title, topics, exercises}] — shape is intentionally flexible
    is_complete = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)
