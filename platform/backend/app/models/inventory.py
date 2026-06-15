from sqlalchemy import Column, String, Integer, DateTime
from app.db.database import Base
from datetime import datetime


class UserInventory(Base):
    __tablename__ = "user_inventory"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False)
    item_id = Column(String, nullable=False)
    purchased_at = Column(DateTime, default=datetime.utcnow)
    equipped_slot = Column(String, nullable=True)  # null = not equipped
