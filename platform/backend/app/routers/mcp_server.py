"""
MCP server implementing the Streamable HTTP transport (2024-11-05 spec).
Each POST to /mcp carries one JSON-RPC message; auth via Bearer personal token.
"""
import hashlib
import json
import re
import uuid
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.personal_token import PersonalToken
from app.models.user import User, HONOR_PER_DIFFICULTY, honor_to_rank
from app.models.exercise import Exercise, TestCase
from app.models.submission import Submission
from app.models.book import Book
from app.models.course import Course
from app.models.progress import DailyProgress
from app.models.user_profile import UserProfile
from app.services.progress_service import record_attempt

router = APIRouter(tags=["mcp"])

# ── Auth ──────────────────────────────────────────────────────────────────────

def _auth(authorization: str | None, db: Session) -> User | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    raw = authorization[7:]
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    pt = db.query(PersonalToken).filter(PersonalToken.token_hash == hashed).first()
    if not pt:
        return None
    pt.last_used_at = datetime.utcnow()
    db.commit()
    return db.query(User).filter(User.id == pt.user_id).first()


# ── Tool implementations ──────────────────────────────────────────────────────

def tool_get_context(user: User, db: Session) -> dict:
    today = date.today()
    since = today - timedelta(days=29)
    rows = db.query(DailyProgress).filter(
        DailyProgress.user_id == user.id,
        DailyProgress.date >= since,
    ).order_by(DailyProgress.date.desc()).all()

    streak = 0
    for i in range(30):
        d = today - timedelta(days=i)
        match = next((r for r in rows if r.date == d), None)
        if match and match.exercises_completed > 0:
            streak += 1
        else:
            break

    total_exercises = db.query(Exercise).count()
    rank = honor_to_rank(user.honor)

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if profile and profile.baseline_done:
        gaps = profile.gaps or []
        profile_summary = {
            "baseline_done": True,
            "gaps_count": len(gaps),
            "top_gaps": [g["concept"] for g in gaps if g.get("severity", 1) >= 2][:3],
            "strengths_count": len(profile.strengths or []),
            "recommendations_pending": len(profile.recommendations or []),
        }
    else:
        profile_summary = {
            "baseline_done": False,
            "tip": (
                "No profile yet. Conduct a brief diagnostic (3-5 open questions about "
                "code/concepts) then call create_profile() to enable personalization."
            ),
        }

    return {
        "user": user.name,
        "rank": rank,
        "honor": user.honor,
        "streak_days": streak,
        "total_exercises_available": total_exercises,
        "profile_summary": profile_summary,
        "tip": "Use get_exercises() to browse katas or get_exercise(slug) to start one.",
    }


def tool_get_exercises(difficulty: str | None, tag: str | None, db: Session) -> list:
    q = db.query(Exercise)
    if difficulty:
        q = q.filter(Exercise.difficulty == difficulty)
    results = []
    for ex in q.order_by(Exercise.difficulty).all():
        tags = ex.tags or []
        if tag and tag not in tags:
            continue
        results.append({
            "slug": ex.slug,
            "title": ex.title,
            "difficulty": ex.difficulty,
            "tags": tags,
            "module": ex.module,
        })
    return results


def tool_get_exercise(slug: str, db: Session) -> dict:
    ex = db.query(Exercise).filter(Exercise.slug == slug).first()
    if not ex:
        return {"error": f"Exercise '{slug}' not found"}
    visible_cases = [
        {"order": tc.order, "description": tc.description, "input": tc.input, "expected": tc.expected}
        for tc in ex.test_cases if tc.visible
    ]
    return {
        "slug": ex.slug,
        "title": ex.title,
        "difficulty": ex.difficulty,
        "tags": ex.tags or [],
        "module": ex.module,
        "description": ex.description,
        "stub": ex.stub,
        "hints": ex.hints or [],
        "test_cases": visible_cases,
    }


def tool_submit_solution(
    slug: str, code: str, passed: bool,
    test_results: list, user: User, db: Session,
) -> dict:
    ex = db.query(Exercise).filter(Exercise.slug == slug).first()
    if not ex:
        return {"error": f"Exercise '{slug}' not found"}

    passed_count = sum(1 for r in test_results if r.get("passed"))
    total_count = len(test_results)
    status = "passed" if passed else ("partial" if passed_count > 0 else "failed")

    sub = Submission(
        id=str(uuid.uuid4()),
        user_id=user.id,
        exercise_id=ex.id,
        code=code,
        status=status,
        test_results=test_results,
    )
    db.add(sub)

    if passed:
        honor_gain = HONOR_PER_DIFFICULTY.get(ex.difficulty, 2)
        user.honor += honor_gain

    record_attempt(db, user.id, completed=passed)
    db.commit()

    return {
        "status": status,
        "passed": passed_count,
        "total": total_count,
        "honor_gained": HONOR_PER_DIFFICULTY.get(ex.difficulty, 2) if passed else 0,
        "new_rank": honor_to_rank(user.honor),
        "message": "✓ Solução aceita!" if passed else f"{passed_count}/{total_count} testes passaram",
    }


def tool_get_progress(user: User, db: Session) -> dict:
    today = date.today()
    since = today - timedelta(days=6)
    rows = db.query(DailyProgress).filter(
        DailyProgress.user_id == user.id,
        DailyProgress.date >= since,
    ).all()
    completed_7d = sum(r.exercises_completed for r in rows)

    total_passed = db.query(Submission).filter(
        Submission.user_id == user.id,
        Submission.status == "passed",
    ).count()

    return {
        "rank": honor_to_rank(user.honor),
        "honor": user.honor,
        "completed_last_7_days": completed_7d,
        "total_passed": total_passed,
        "daily": [{"date": str(r.date), "completed": r.exercises_completed} for r in rows],
    }


def tool_get_books(user: User, db: Session) -> list:
    books = db.query(Book).filter(Book.user_id == user.id).all()
    return [
        {
            "slug": b.slug, "title": b.title, "author": b.author,
            "type": b.content_type, "has_text": bool(b.text_path),
        }
        for b in books
    ]


def _profile_to_dict(p: UserProfile) -> dict:
    return {
        "baseline_done": bool(p.baseline_done),
        "strengths": p.strengths or [],
        "gaps": p.gaps or [],
        "level": p.level or {},
        "style": p.style or {},
        "notes": p.notes or [],
        "recommendations": p.recommendations or [],
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


def tool_get_profile(user: User, db: Session) -> dict:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        return {
            "baseline_done": False,
            "tip": (
                "No profile exists yet. Run a diagnostic assessment (3-5 open questions) "
                "then call create_profile() with your observations."
            ),
        }
    return _profile_to_dict(profile)


def tool_create_profile(
    strengths: list,
    gaps: list,
    level: dict,
    style: dict,
    notes: list,
    recommendations: list,
    user: User,
    db: Session,
) -> dict:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    now = datetime.utcnow()
    if profile:
        profile.baseline_done = True
        profile.strengths = strengths
        profile.gaps = gaps
        profile.level = level
        profile.style = style
        profile.notes = notes
        profile.recommendations = recommendations
        profile.updated_at = now
    else:
        profile = UserProfile(
            id=str(uuid.uuid4()),
            user_id=user.id,
            baseline_done=True,
            strengths=strengths,
            gaps=gaps,
            level=level,
            style=style,
            notes=notes,
            recommendations=recommendations,
            created_at=now,
            updated_at=now,
        )
        db.add(profile)
    db.commit()
    return {
        "message": "Profile created/updated. Baseline done.",
        "gaps": len(gaps),
        "strengths": len(strengths),
    }


_ALLOWED_PROFILE_FIELDS = {"strengths", "gaps", "level", "style", "notes", "recommendations"}


def tool_update_profile(field: str, data: Any, user: User, db: Session) -> dict:
    if field not in _ALLOWED_PROFILE_FIELDS:
        return {"error": f"Unknown field '{field}'. Allowed: {sorted(_ALLOWED_PROFILE_FIELDS)}"}
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        return {"error": "No profile yet. Call create_profile() first."}
    setattr(profile, field, data)
    profile.updated_at = datetime.utcnow()
    db.commit()
    return {"message": f"Profile.{field} updated.", "baseline_done": bool(profile.baseline_done)}


def tool_add_profile_note(text: str, category: str, user: User, db: Session) -> dict:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        return {"error": "No profile yet. Call create_profile() first."}
    notes = list(profile.notes or [])
    notes.append({"text": text, "category": category, "date": datetime.utcnow().isoformat()})
    profile.notes = notes
    profile.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Note added.", "total_notes": len(notes)}


def tool_get_book_content(slug: str, page: int, user: User, db: Session) -> dict:
    book = db.query(Book).filter(Book.slug == slug, Book.user_id == user.id).first()
    if not book:
        return {"error": f"Book '{slug}' not found or not yours"}
    if not book.text_path:
        return {"error": "Text not extracted yet — ask the user to open the book and click 'Texto'"}
    try:
        pages: list[dict] = json.loads(Path(book.text_path).read_text(encoding="utf-8"))
    except Exception:
        return {"error": "Failed to read extracted text"}
    total = len(pages)
    if page < 1 or page > total:
        return {"error": f"Page {page} out of range (1–{total})", "total_pages": total}
    entry = next((p for p in pages if p["page"] == page), None)
    if not entry:
        return {"error": f"Page {page} not found", "total_pages": total}
    return {"slug": slug, "page": page, "total_pages": total, "text": entry["text"]}


def tool_search_book(slug: str, query: str, user: User, db: Session) -> dict:
    book = db.query(Book).filter(Book.slug == slug, Book.user_id == user.id).first()
    if not book:
        return {"error": f"Book '{slug}' not found or not yours"}
    if not book.text_path:
        return {"error": "Text not extracted yet"}
    try:
        pages: list[dict] = json.loads(Path(book.text_path).read_text(encoding="utf-8"))
    except Exception:
        return {"error": "Failed to read extracted text"}

    pattern = re.compile(re.escape(query), re.IGNORECASE)
    matches = []
    for p in pages:
        text = p.get("text", "")
        if pattern.search(text):
            # Return a short excerpt around the first match
            m = pattern.search(text)
            start = max(0, m.start() - 120)
            end = min(len(text), m.end() + 120)
            excerpt = ("…" if start > 0 else "") + text[start:end].strip() + ("…" if end < len(text) else "")
            matches.append({"page": p["page"], "excerpt": excerpt})
        if len(matches) >= 10:
            break

    return {
        "slug": slug,
        "query": query,
        "total_pages": len(pages),
        "matches": matches,
        "count": len(matches),
    }


def _slugify(text: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def tool_create_exercise(
    title: str,
    description: str,
    difficulty: str,
    tags: list,
    stub: str,
    test_cases: list,
    hints: list,
    concepts: list,
    book_reference: str | None,
    user: User,
    db: Session,
) -> dict:
    slug_base = _slugify(title)
    slug = slug_base
    n = 1
    while db.query(Exercise).filter(Exercise.slug == slug).first():
        slug = f"{slug_base}-{n}"
        n += 1

    ex = Exercise(
        id=str(uuid.uuid4()),
        title=title,
        slug=slug,
        difficulty=difficulty,
        phase=0,
        module="ai-generated",
        tags=tags,
        description=description,
        rationale="AI-generated exercise for " + user.name,
        stub=stub,
        solution="",
        hints=hints,
        concepts=concepts,
        generated_by="chat-ai",
        book_reference=book_reference,
        user_id=user.id,
    )
    db.add(ex)
    db.flush()

    for i, tc in enumerate(test_cases):
        db.add(TestCase(
            exercise_id=ex.id,
            order=i,
            description=tc.get("description", f"Test {i + 1}"),
            input=tc.get("input", ""),
            expected=tc.get("expected", ""),
            visible=tc.get("visible", True),
        ))

    db.commit()
    return {"slug": slug, "title": title, "difficulty": difficulty, "message": "Exercise created!"}


def tool_create_course(
    title: str,
    book_slug: str | None,
    description: str,
    modules: list,
    is_complete: bool,
    user: User,
    db: Session,
) -> dict:
    course = Course(
        id=str(uuid.uuid4()),
        user_id=user.id,
        title=title,
        book_slug=book_slug,
        description=description,
        modules=modules,
        is_complete=is_complete,
    )
    db.add(course)
    db.commit()
    return {
        "id": course.id,
        "title": title,
        "module_count": len(modules),
        "is_complete": is_complete,
        "message": "Course created! Use append_course_modules to add more modules later." if not is_complete else "Course created!",
    }


def tool_append_course_modules(
    course_id: str,
    modules: list,
    is_complete: bool,
    user: User,
    db: Session,
) -> dict:
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user.id).first()
    if not course:
        return {"error": f"Course '{course_id}' not found or not yours"}
    existing = course.modules or []
    course.modules = existing + modules
    course.is_complete = is_complete
    db.commit()
    return {
        "id": course.id,
        "title": course.title,
        "total_modules": len(course.modules),
        "is_complete": is_complete,
        "message": "Modules appended." + (" Course marked complete." if is_complete else " Still in progress."),
    }


# ── Tool registry ─────────────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "get_context",
        "description": "Get your current learning context: rank, honor, streak, and platform overview. Call this at the start of every session.",
        "inputSchema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_exercises",
        "description": "List available katas. Filter by difficulty (8kyu–3kyu) or tag (python, fastapi, http, sql, etc.).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "difficulty": {"type": "string", "description": "8kyu | 7kyu | 6kyu | 5kyu | 4kyu | 3kyu"},
                "tag": {"type": "string"},
            },
        },
    },
    {
        "name": "get_exercise",
        "description": "Get full exercise details: description, starter code, visible test cases, and hints.",
        "inputSchema": {
            "type": "object",
            "properties": {"slug": {"type": "string"}},
            "required": ["slug"],
        },
    },
    {
        "name": "submit_solution",
        "description": "Record a solution and its test results to the platform. Run tests locally first.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "slug": {"type": "string"},
                "code": {"type": "string", "description": "Final Python solution"},
                "passed": {"type": "boolean", "description": "True if ALL tests passed"},
                "test_results": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "passed": {"type": "boolean"},
                            "input": {"type": "string"},
                            "expected": {"type": "string"},
                            "got": {"type": "string"},
                        },
                        "required": ["passed"],
                    },
                },
            },
            "required": ["slug", "code", "passed", "test_results"],
        },
    },
    {
        "name": "get_progress",
        "description": "Get your rank, honor, completed exercises in the last 7 days, and daily breakdown.",
        "inputSchema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_books",
        "description": "List your books on the platform (PDF and Markdown).",
        "inputSchema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_profile",
        "description": (
            "Get the user's learning profile: strengths, gaps (with severity), level per concept, "
            "reasoning style, notes, and personalized recommendations. "
            "Call this at the start of every session. If baseline_done is false, "
            "conduct a diagnostic assessment first and then call create_profile()."
        ),
        "inputSchema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "create_profile",
        "description": (
            "Create or fully replace the user's learning profile (the 'model zero'). "
            "Call this after conducting a diagnostic assessment. Sets baseline_done=true. "
            "Idempotent — safe to call again if you need to overwrite."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "strengths": {
                    "type": "array",
                    "description": "Observed strengths. Each item: {concept, evidence, observed_at}",
                    "items": {"type": "object"},
                },
                "gaps": {
                    "type": "array",
                    "description": (
                        "Identified gaps. Each item: {concept, type: 'wrong_concept'|'missing_vocab'|'fundament_gap', "
                        "severity: 1|2|3 (1=minor, 2=important, 3=critical), evidence, last_seen}"
                    ),
                    "items": {"type": "object"},
                },
                "level": {
                    "type": "object",
                    "description": "Per-concept level. {concept: {score: 0.0-1.0, attempts: int, last_updated: iso}}",
                },
                "style": {
                    "type": "object",
                    "description": "Learning style. {reasoning: 'pragmatic|intuitive|theoretical', engagement: 'active|passive', attention: 'short|long', ...}",
                },
                "notes": {
                    "type": "array",
                    "description": "Initial observations. Each item: {text, category: 'quiz'|'session'|'code_review'|'daily_agent', date}",
                    "items": {"type": "object"},
                },
                "recommendations": {
                    "type": "array",
                    "description": "Personalized content suggestions. Each item: {type: 'book'|'exercise'|'course'|'topic', ref, reason, created_at}",
                    "items": {"type": "object"},
                },
            },
            "required": ["strengths", "gaps", "level", "style", "notes", "recommendations"],
        },
    },
    {
        "name": "update_profile",
        "description": (
            "Replace one field of the user's profile. Use this to keep the profile up to date "
            "after sessions or in the daily agent cycle. field must be one of: "
            "strengths, gaps, level, style, notes, recommendations."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "field": {
                    "type": "string",
                    "description": "strengths | gaps | level | style | notes | recommendations",
                },
                "data": {
                    "description": "New value for the field (replaces the existing value entirely).",
                },
            },
            "required": ["field", "data"],
        },
    },
    {
        "name": "add_profile_note",
        "description": (
            "Append a single observation to the profile notes without replacing the whole list. "
            "Use during a session when you notice something significant."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "The observation text"},
                "category": {
                    "type": "string",
                    "description": "session | quiz | code_review | daily_agent",
                },
            },
            "required": ["text", "category"],
        },
    },
    {
        "name": "get_book_content",
        "description": "Read a specific page of extracted text from one of your books. Use get_books() first to see available books and whether text has been extracted.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "slug": {"type": "string", "description": "Book slug from get_books()"},
                "page": {"type": "integer", "description": "Page number (1-indexed)"},
            },
            "required": ["slug", "page"],
        },
    },
    {
        "name": "search_book",
        "description": "Search for a keyword or phrase across all pages of one of your books. Returns up to 10 matching pages with excerpts.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "slug": {"type": "string", "description": "Book slug"},
                "query": {"type": "string", "description": "Search term or phrase"},
            },
            "required": ["slug", "query"],
        },
    },
    {
        "name": "create_exercise",
        "description": "Create a personalized kata/exercise for the user and save it to the platform. The user will see it in their exercise list.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "description": {"type": "string", "description": "Full problem statement in Markdown"},
                "difficulty": {"type": "string", "description": "8kyu | 7kyu | 6kyu | 5kyu | 4kyu | 3kyu"},
                "tags": {"type": "array", "items": {"type": "string"}, "description": "e.g. [\"fastapi\", \"http\"]"},
                "stub": {"type": "string", "description": "Starter code the user sees"},
                "test_cases": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "description": {"type": "string"},
                            "input": {"type": "string"},
                            "expected": {"type": "string"},
                            "visible": {"type": "boolean"},
                        },
                        "required": ["description", "input", "expected"],
                    },
                },
                "hints": {"type": "array", "items": {"type": "string"}},
                "concepts": {"type": "array", "items": {"type": "string"}, "description": "e.g. [\"fastapi:routing\", \"http:status-codes\"]"},
                "book_reference": {"type": "string", "description": "Book slug this exercise is based on (optional)"},
            },
            "required": ["title", "description", "difficulty", "tags", "stub", "test_cases"],
        },
    },
    {
        "name": "create_course",
        "description": (
            "Create a personalized course for the user. Courses can be created incrementally — "
            "set is_complete=false to leave it open for more modules later (use append_course_modules). "
            "The module format is flexible; use whatever structure best serves the content."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "book_slug": {"type": "string", "description": "Book the course is based on (optional)"},
                "description": {"type": "string"},
                "modules": {
                    "type": "array",
                    "description": "Initial list of course modules. Format is flexible.",
                    "items": {"type": "object"},
                },
                "is_complete": {
                    "type": "boolean",
                    "description": "False = course is still being built (default). True = all modules are ready.",
                },
            },
            "required": ["title", "description", "modules"],
        },
    },
    {
        "name": "append_course_modules",
        "description": "Add more modules to an existing in-progress course. Use the course id returned by create_course.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "course_id": {"type": "string", "description": "Course id from create_course"},
                "modules": {
                    "type": "array",
                    "description": "New modules to append. Same flexible format as create_course.",
                    "items": {"type": "object"},
                },
                "is_complete": {
                    "type": "boolean",
                    "description": "Set true to mark the course as finished after this append.",
                },
            },
            "required": ["course_id", "modules", "is_complete"],
        },
    },
]


async def _dispatch(name: str, args: dict, user: User, db: Session) -> Any:
    if name == "get_context":
        return tool_get_context(user, db)
    if name == "get_exercises":
        return tool_get_exercises(args.get("difficulty"), args.get("tag"), db)
    if name == "get_exercise":
        return tool_get_exercise(args.get("slug", ""), db)
    if name == "submit_solution":
        return tool_submit_solution(
            args.get("slug", ""), args.get("code", ""),
            args.get("passed", False), args.get("test_results", []),
            user, db,
        )
    if name == "get_progress":
        return tool_get_progress(user, db)
    if name == "get_books":
        return tool_get_books(user, db)
    if name == "get_profile":
        return tool_get_profile(user, db)
    if name == "create_profile":
        return tool_create_profile(
            args.get("strengths", []),
            args.get("gaps", []),
            args.get("level", {}),
            args.get("style", {}),
            args.get("notes", []),
            args.get("recommendations", []),
            user, db,
        )
    if name == "update_profile":
        return tool_update_profile(args.get("field", ""), args.get("data"), user, db)
    if name == "add_profile_note":
        return tool_add_profile_note(args.get("text", ""), args.get("category", "session"), user, db)
    if name == "get_book_content":
        return tool_get_book_content(args.get("slug", ""), args.get("page", 1), user, db)
    if name == "search_book":
        return tool_search_book(args.get("slug", ""), args.get("query", ""), user, db)
    if name == "create_exercise":
        return tool_create_exercise(
            args.get("title", ""),
            args.get("description", ""),
            args.get("difficulty", "7kyu"),
            args.get("tags", []),
            args.get("stub", ""),
            args.get("test_cases", []),
            args.get("hints", []),
            args.get("concepts", []),
            args.get("book_reference"),
            user, db,
        )
    if name == "create_course":
        return tool_create_course(
            args.get("title", ""),
            args.get("book_slug"),
            args.get("description", ""),
            args.get("modules", []),
            args.get("is_complete", False),
            user, db,
        )
    if name == "append_course_modules":
        return tool_append_course_modules(
            args.get("course_id", ""),
            args.get("modules", []),
            args.get("is_complete", False),
            user, db,
        )
    return {"error": f"Unknown tool: {name}"}


# ── JSON-RPC helpers ──────────────────────────────────────────────────────────

def _ok(id_: Any, result: Any) -> dict:
    return {"jsonrpc": "2.0", "id": id_, "result": result}


def _err(id_: Any, code: int, msg: str) -> dict:
    return {"jsonrpc": "2.0", "id": id_, "error": {"code": code, "message": msg}}


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/mcp")
async def mcp_endpoint(request: Request):
    db: Session = SessionLocal()
    try:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        user = _auth(auth_header, db)
        if not user:
            return JSONResponse(
                _err(None, -32001, "Unauthorized — provide a valid personal access token"),
                status_code=401,
            )

        body = await request.json()
        messages = body if isinstance(body, list) else [body]
        responses = []

        for msg in messages:
            id_ = msg.get("id")
            method = msg.get("method", "")
            params = msg.get("params", {})

            if method == "initialize":
                responses.append(_ok(id_, {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": "study-platform", "version": "1.0.0"},
                }))

            elif method in ("notifications/initialized", "notifications/cancelled"):
                continue  # notifications have no response

            elif method == "ping":
                responses.append(_ok(id_, {}))

            elif method == "tools/list":
                responses.append(_ok(id_, {"tools": TOOLS}))

            elif method == "tools/call":
                tool_name = params.get("name", "")
                tool_args = params.get("arguments", {})
                result = await _dispatch(tool_name, tool_args, user, db)
                responses.append(_ok(id_, {
                    "content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False, indent=2)}],
                }))

            elif id_ is not None:
                responses.append(_err(id_, -32601, f"Method not found: {method}"))

        if not responses:
            return Response(status_code=204)
        return JSONResponse(responses[0] if len(responses) == 1 else responses)

    finally:
        db.close()
