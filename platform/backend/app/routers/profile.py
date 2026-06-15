from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.user_profile import UserProfile

router = APIRouter(prefix="/profile", tags=["profile"])


def _serialize(p: UserProfile) -> dict:
    return {
        "id": p.id,
        "baseline_done": bool(p.baseline_done),
        "strengths": p.strengths or [],
        "gaps": p.gaps or [],
        "level": p.level or {},
        "style": p.style or {},
        "notes": p.notes or [],
        "recommendations": p.recommendations or [],
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


@router.get("/me")
def get_my_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        return {"baseline_done": False}
    return _serialize(profile)
