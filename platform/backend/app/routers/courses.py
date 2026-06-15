from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.course import Course
from app.models.user import User

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("")
def list_courses(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    courses = (
        db.query(Course)
        .filter(Course.user_id == user.id)
        .order_by(Course.created_at.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "title": c.title,
            "book_slug": c.book_slug,
            "description": c.description,
            "modules": c.modules or [],
            "is_complete": bool(c.is_complete),
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in courses
    ]
