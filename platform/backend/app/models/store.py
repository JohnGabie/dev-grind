from sqlalchemy import Column, String, Integer, Text, Boolean
from app.db.database import Base


class StoreItem(Base):
    __tablename__ = "store_items"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String, nullable=False)       # 'background'
    category = Column(String, nullable=False)   # 'starfield'
    price_coins = Column(Integer, nullable=False, default=0)
    rarity = Column(String, nullable=False, default="common")  # free common rare legendary
    item_data = Column(Text, nullable=False, default="{}")
    is_active = Column(Boolean, nullable=False, default=True)
