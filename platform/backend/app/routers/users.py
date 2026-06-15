import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, honor_to_rank, rank_progress, RANK_THRESHOLDS
from app.models.submission import Submission
from app.models.exercise import Exercise
from app.models.progress import DailyProgress
from app.services.progress_service import get_summary

router = APIRouter(prefix="/users", tags=["users"])


class UserUpdate(BaseModel):
    name: str | None = None
    bio: str | None = None
    social_links: dict | None = None


@router.patch("/me")
def update_me(
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.name is not None:
        if not body.name.strip():
            raise HTTPException(status_code=422, detail="name cannot be empty")
        current_user.name = body.name.strip()
    if body.bio is not None:
        current_user.bio = body.bio.strip() or None
    if body.social_links is not None:
        import json
        current_user.social_links = json.dumps(body.social_links)
    db.commit()
    return {"name": current_user.name, "bio": current_user.bio}


@router.post("/me/cover")
async def upload_cover(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="o arquivo precisa ser uma imagem")

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        ext = "jpg"

    filename = f"{current_user.id}.{ext}"
    path = f"app/uploads/covers/{filename}"

    # Remove old cover file if extension changed
    for old_ext in {"jpg", "jpeg", "png", "webp", "gif"} - {ext}:
        old_path = f"app/uploads/covers/{current_user.id}.{old_ext}"
        if os.path.exists(old_path):
            os.remove(old_path)

    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)

    current_user.cover_url = f"/covers/{filename}"
    db.commit()
    return {"cover_url": current_user.cover_url}


@router.delete("/me/cover")
def delete_cover(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.cover_url:
        path = f"app/uploads{current_user.cover_url}"
        if os.path.exists(path):
            os.remove(path)
        current_user.cover_url = None
        db.commit()
    return {"cover_url": None}


@router.get("/me/stats")
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = current_user

    total_completed = (
        db.query(func.count(Submission.id))
        .filter(Submission.user_id == user.id, Submission.status == "passed")
        .scalar() or 0
    )
    total_attempted = (
        db.query(func.count(Submission.id))
        .filter(Submission.user_id == user.id)
        .scalar() or 0
    )

    rank = honor_to_rank(user.honor)
    progress = rank_progress(user.honor)

    next_rank_idx = next(
        (i + 1 for i, (_, name) in enumerate(RANK_THRESHOLDS) if name == rank),
        len(RANK_THRESHOLDS) - 1,
    )
    honor_for_next = RANK_THRESHOLDS[min(next_rank_idx, len(RANK_THRESHOLDS) - 1)][0]

    days_since_joined = 0
    if user.created_at:
        days_since_joined = (date.today() - user.created_at.date()).days

    days_active = (
        db.query(func.count(DailyProgress.id))
        .filter(DailyProgress.user_id == user.id, DailyProgress.exercises_completed > 0)
        .scalar() or 0
    )

    summary = get_summary(db, user_id=user.id, days=7)

    recent = (
        db.query(Submission, Exercise)
        .join(Exercise, Submission.exercise_id == Exercise.id)
        .filter(Submission.user_id == user.id, Submission.status == "passed")
        .order_by(Submission.submitted_at.desc())
        .limit(5)
        .all()
    )
    recent_completions = [
        {
            "title": ex.title,
            "slug": ex.slug,
            "difficulty": ex.difficulty,
            "submitted_at": str(sub.submitted_at),
        }
        for sub, ex in recent
    ]

    since = date.today() - timedelta(days=364)
    kata_rows = (
        db.query(
            func.date(Submission.submitted_at).label("day"),
            func.count(Submission.id).label("count"),
        )
        .filter(
            Submission.user_id == user.id,
            Submission.status == "passed",
            func.date(Submission.submitted_at) >= since,
        )
        .group_by(func.date(Submission.submitted_at))
        .all()
    )
    heatmap: dict = {}
    for row in kata_rows:
        day = str(row.day)
        heatmap[day] = {"total": row.count, "katas": row.count, "books": 0, "courses": 0}

    return {
        "user": {
            "name": user.name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "cover_url": user.cover_url,
            "bio": user.bio,
            "social_links": __import__('json').loads(user.social_links or '{}'),
            "created_at": str(user.created_at.date()),
        },
        "rank": rank,
        "rank_progress": round(progress, 3),
        "honor": user.honor,
        "coins": user.coins,
        "honor_for_next_rank": honor_for_next,
        "total_completed": total_completed,
        "total_attempted": total_attempted,
        "completion_rate": round(total_completed / total_attempted, 2) if total_attempted else 0,
        "current_streak": summary["current_streak"],
        "days_active": days_active,
        "days_since_joined": days_since_joined,
        "recent_completions": recent_completions,
        "heatmap": heatmap,
        "weekly_summary": summary,
    }
