from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Generator
from uuid import uuid4


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = ROOT / "data" / "proposal_workspace.sqlite3"


def _using_postgres() -> bool:
    url = os.getenv("DATABASE_URL", "")
    return bool(url) and url.startswith(("postgres://", "postgresql://"))


def _db_path() -> Path:
    return Path(os.getenv("PROPOSAL_WORKSPACE_DB", str(DEFAULT_DB_PATH)))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _json_dump(value: Any) -> str:
    return json.dumps(value if value is not None else None, ensure_ascii=False)


def _json_load(value: str | None) -> Any:
    if not value:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return None


@contextmanager
def _connect() -> Generator[Any, None, None]:
    if _using_postgres():
        import psycopg2
        import psycopg2.extras

        conn = psycopg2.connect(
            os.getenv("DATABASE_URL"),
            cursor_factory=psycopg2.extras.RealDictCursor,
        )
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    else:
        path = _db_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def _run(conn: Any, sql: str, params: tuple = ()) -> Any:
    """Execute SQL and return a cursor. Adapts placeholder syntax for Postgres."""
    if _using_postgres():
        cur = conn.cursor()
        cur.execute(sql.replace("?", "%s"), params)
        return cur
    return conn.execute(sql, params)


def init_workspace_store() -> None:
    with _connect() as conn:
        _run(
            conn,
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """,
        )
        _run(
            conn,
            """
            CREATE TABLE IF NOT EXISTS community_profiles (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE,
                profile_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """,
        )
        _run(
            conn,
            """
            CREATE TABLE IF NOT EXISTS proposals (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                community_name TEXT NOT NULL DEFAULT '',
                grant_name TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'draft',
                current_step INTEGER NOT NULL DEFAULT 1,
                requirements_json TEXT,
                profile_json TEXT,
                draft_json TEXT,
                enhanced_json TEXT,
                structured_answers_json TEXT,
                prompt_coverage_json TEXT,
                validation_json TEXT,
                final_sections_json TEXT,
                community_profile_id TEXT,
                community_profile_snapshot_json TEXT,
                application_details_json TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_exported_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """,
        )
        _ensure_column(conn, "proposals", "structured_answers_json", "TEXT")
        _ensure_column(conn, "proposals", "community_profile_id", "TEXT")
        _ensure_column(conn, "proposals", "community_profile_snapshot_json", "TEXT")
        _ensure_column(conn, "proposals", "application_details_json", "TEXT")
        _run(
            conn,
            "CREATE INDEX IF NOT EXISTS idx_proposals_user_updated ON proposals(user_id, updated_at DESC)",
        )
        _run(
            conn,
            """
            CREATE TABLE IF NOT EXISTS proposal_feedback_reports (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                source_proposal_id TEXT,
                parent_report_id TEXT,
                title TEXT NOT NULL,
                source_filename TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'complete',
                rubric_version TEXT NOT NULL,
                overall_score REAL,
                priority_issue_count INTEGER NOT NULL DEFAULT 0,
                category_scores_json TEXT NOT NULL,
                report_json TEXT NOT NULL,
                extracted_sections_json TEXT NOT NULL,
                grant_context_json TEXT,
                created_at TEXT NOT NULL,
                analyzed_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (source_proposal_id) REFERENCES proposals(id),
                FOREIGN KEY (parent_report_id) REFERENCES proposal_feedback_reports(id)
            )
            """,
        )
        _run(
            conn,
            "CREATE INDEX IF NOT EXISTS idx_feedback_reports_user_analyzed ON proposal_feedback_reports(user_id, analyzed_at DESC)",
        )
        _run(
            conn,
            "CREATE INDEX IF NOT EXISTS idx_feedback_reports_source ON proposal_feedback_reports(user_id, source_proposal_id, analyzed_at DESC)",
        )


def _ensure_column(conn: Any, table: str, column: str, definition: str) -> None:
    if _using_postgres():
        _run(conn, f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {definition}")
        return
    rows = _run(conn, f"PRAGMA table_info({table})").fetchall()
    existing = {row["name"] for row in rows}
    if column not in existing:
        _run(conn, f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def get_or_create_user(user_id: str, email: str, name: str) -> dict[str, Any]:
    init_workspace_store()
    now = _now()
    with _connect() as conn:
        existing = _run(conn, "SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if existing:
            _run(
                conn,
                "UPDATE users SET email = ?, name = ?, updated_at = ? WHERE id = ?",
                (email, name, now, user_id),
            )
            row = _run(conn, "SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            return _row_to_user(row)
        _run(
            conn,
            "INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, email, name, now, now),
        )
    return {"id": user_id, "email": email, "name": name, "created_at": now, "updated_at": now}


def get_community_profile(user_id: str) -> dict[str, Any] | None:
    init_workspace_store()
    with _connect() as conn:
        row = _run(conn, "SELECT * FROM community_profiles WHERE user_id = ?", (user_id,)).fetchone()
    return _row_to_community_profile(row) if row else None


def upsert_community_profile(user_id: str, profile: dict[str, Any]) -> dict[str, Any]:
    init_workspace_store()
    existing = get_community_profile(user_id)
    now = _now()
    if existing:
        with _connect() as conn:
            _run(
                conn,
                "UPDATE community_profiles SET profile_json = ?, updated_at = ? WHERE user_id = ?",
                (_json_dump(profile), now, user_id),
            )
            row = _run(conn, "SELECT * FROM community_profiles WHERE user_id = ?", (user_id,)).fetchone()
        return _row_to_community_profile(row)

    profile_id = uuid4().hex[:12]
    with _connect() as conn:
        _run(
            conn,
            "INSERT INTO community_profiles (id, user_id, profile_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (profile_id, user_id, _json_dump(profile), now, now),
        )
        row = _run(conn, "SELECT * FROM community_profiles WHERE user_id = ?", (user_id,)).fetchone()
    return _row_to_community_profile(row)


def list_proposals(user_id: str) -> list[dict[str, Any]]:
    init_workspace_store()
    with _connect() as conn:
        rows = _run(
            conn,
            "SELECT * FROM proposals WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        ).fetchall()
    return [_row_to_proposal(row, include_payload=False) for row in rows]


def create_proposal(user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    init_workspace_store()
    now = _now()
    proposal_id = payload.get("id") or uuid4().hex[:12]
    title = payload.get("title") or payload.get("grant_name") or "Untitled Proposal"
    with _connect() as conn:
        _run(
            conn,
            """
            INSERT INTO proposals (
                id, user_id, title, community_name, grant_name, status, current_step,
                requirements_json, profile_json, draft_json, enhanced_json,
                structured_answers_json, prompt_coverage_json, validation_json, final_sections_json,
                community_profile_id, community_profile_snapshot_json, application_details_json,
                created_at, updated_at, last_exported_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                proposal_id,
                user_id,
                title,
                payload.get("community_name") or "",
                payload.get("grant_name") or "",
                payload.get("status") or "draft",
                int(payload.get("current_step") or 1),
                _json_dump(payload.get("requirements")),
                _json_dump(payload.get("profile")),
                _json_dump(payload.get("draft")),
                _json_dump(payload.get("enhanced")),
                _json_dump(payload.get("structured_answers")),
                _json_dump(payload.get("prompt_coverage")),
                _json_dump(payload.get("validation")),
                _json_dump(payload.get("final_sections")),
                payload.get("community_profile_id"),
                _json_dump(payload.get("community_profile_snapshot")),
                _json_dump(payload.get("application_details")),
                now,
                now,
                payload.get("last_exported_at"),
            ),
        )
        row = _run(
            conn,
            "SELECT * FROM proposals WHERE id = ? AND user_id = ?",
            (proposal_id, user_id),
        ).fetchone()
    return _row_to_proposal(row, include_payload=True)


def get_proposal(user_id: str, proposal_id: str) -> dict[str, Any] | None:
    init_workspace_store()
    with _connect() as conn:
        row = _run(
            conn,
            "SELECT * FROM proposals WHERE id = ? AND user_id = ?",
            (proposal_id, user_id),
        ).fetchone()
    return _row_to_proposal(row, include_payload=True) if row else None


def update_proposal(user_id: str, proposal_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    init_workspace_store()
    existing = get_proposal(user_id, proposal_id)
    if not existing:
        return None

    merged = {**existing, **updates}
    if "profile" in updates and isinstance(updates["profile"], dict):
        merged["community_name"] = updates["profile"].get("community_name") or merged.get("community_name") or ""
    if "requirements" in updates and isinstance(updates["requirements"], dict):
        merged["grant_name"] = updates["requirements"].get("grant_name") or merged.get("grant_name") or ""
        if not merged.get("title"):
            merged["title"] = merged["grant_name"] or "Untitled Proposal"
    if updates.get("grant_name"):
        merged["grant_name"] = updates["grant_name"]

    now = _now()
    with _connect() as conn:
        _run(
            conn,
            """
            UPDATE proposals
            SET title = ?, community_name = ?, grant_name = ?, status = ?, current_step = ?,
                requirements_json = ?, profile_json = ?, draft_json = ?, enhanced_json = ?,
                structured_answers_json = ?, prompt_coverage_json = ?, validation_json = ?, final_sections_json = ?,
                community_profile_id = ?, community_profile_snapshot_json = ?, application_details_json = ?,
                updated_at = ?, last_exported_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (
                merged.get("title") or "Untitled Proposal",
                merged.get("community_name") or "",
                merged.get("grant_name") or "",
                merged.get("status") or "draft",
                int(merged.get("current_step") or 1),
                _json_dump(merged.get("requirements")),
                _json_dump(merged.get("profile")),
                _json_dump(merged.get("draft")),
                _json_dump(merged.get("enhanced")),
                _json_dump(merged.get("structured_answers")),
                _json_dump(merged.get("prompt_coverage")),
                _json_dump(merged.get("validation")),
                _json_dump(merged.get("final_sections")),
                merged.get("community_profile_id"),
                _json_dump(merged.get("community_profile_snapshot")),
                _json_dump(merged.get("application_details")),
                now,
                merged.get("last_exported_at"),
                proposal_id,
                user_id,
            ),
        )
        row = _run(
            conn,
            "SELECT * FROM proposals WHERE id = ? AND user_id = ?",
            (proposal_id, user_id),
        ).fetchone()
    return _row_to_proposal(row, include_payload=True)


def duplicate_proposal(user_id: str, proposal_id: str) -> dict[str, Any] | None:
    existing = get_proposal(user_id, proposal_id)
    if not existing:
        return None
    copy_payload = {
        key: existing.get(key)
        for key in (
            "community_name",
            "grant_name",
            "current_step",
            "requirements",
            "profile",
            "draft",
            "enhanced",
            "structured_answers",
            "prompt_coverage",
            "validation",
            "final_sections",
            "community_profile_id",
            "community_profile_snapshot",
            "application_details",
        )
    }
    copy_payload.update(
        {
            "title": f"{existing.get('title') or 'Untitled Proposal'} - Copy",
            "status": "ready_to_export" if existing.get("final_sections") else "draft_copy",
            "last_exported_at": None,
        }
    )
    return create_proposal(user_id, copy_payload)


def delete_proposal(user_id: str, proposal_id: str) -> bool:
    init_workspace_store()
    with _connect() as conn:
        cur = _run(conn, "DELETE FROM proposals WHERE id = ? AND user_id = ?", (proposal_id, user_id))
    return cur.rowcount > 0


def mark_proposal_exported(user_id: str, proposal_id: str) -> dict[str, Any] | None:
    return update_proposal(
        user_id,
        proposal_id,
        {
            "status": "exported",
            "current_step": 5,
            "last_exported_at": _now(),
        },
    )


def create_feedback_report(user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Create an immutable, user-scoped proposal review snapshot."""
    init_workspace_store()
    now = _now()
    report_id = payload.get("id") or uuid4().hex[:12]
    analyzed_at = payload.get("analyzed_at") or now
    with _connect() as conn:
        _run(
            conn,
            """
            INSERT INTO proposal_feedback_reports (
                id, user_id, source_proposal_id, parent_report_id, title, source_filename,
                status, rubric_version, overall_score, priority_issue_count,
                category_scores_json, report_json, extracted_sections_json, grant_context_json,
                created_at, analyzed_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report_id,
                user_id,
                payload.get("source_proposal_id"),
                payload.get("parent_report_id"),
                payload.get("title") or "Untitled Proposal Review",
                payload.get("source_filename") or "",
                payload.get("status") or "complete",
                payload.get("rubric_version") or "proposal-readiness-v1",
                payload.get("overall_score"),
                int(payload.get("priority_issue_count") or 0),
                _json_dump(payload.get("category_scores") or {}),
                _json_dump(payload.get("report") or {}),
                _json_dump(payload.get("extracted_sections") or []),
                _json_dump(payload.get("grant_context")),
                now,
                analyzed_at,
            ),
        )
        row = _run(
            conn,
            "SELECT * FROM proposal_feedback_reports WHERE id = ? AND user_id = ?",
            (report_id, user_id),
        ).fetchone()
    return _row_to_feedback_report(row, include_payload=True)


def list_feedback_reports(user_id: str) -> list[dict[str, Any]]:
    init_workspace_store()
    with _connect() as conn:
        rows = _run(
            conn,
            "SELECT * FROM proposal_feedback_reports WHERE user_id = ? ORDER BY analyzed_at DESC",
            (user_id,),
        ).fetchall()
    return [_row_to_feedback_report(row, include_payload=False) for row in rows]


def get_feedback_report(user_id: str, report_id: str) -> dict[str, Any] | None:
    init_workspace_store()
    with _connect() as conn:
        row = _run(
            conn,
            "SELECT * FROM proposal_feedback_reports WHERE id = ? AND user_id = ?",
            (report_id, user_id),
        ).fetchone()
    return _row_to_feedback_report(row, include_payload=True) if row else None


def delete_feedback_report(user_id: str, report_id: str) -> bool:
    init_workspace_store()
    with _connect() as conn:
        cur = _run(
            conn,
            "DELETE FROM proposal_feedback_reports WHERE id = ? AND user_id = ?",
            (report_id, user_id),
        )
    return cur.rowcount > 0


def _row_to_user(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _row_to_community_profile(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "profile": _json_load(row["profile_json"]) or {},
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _row_to_proposal(row: Any, *, include_payload: bool) -> dict[str, Any]:
    proposal = {
        "id": row["id"],
        "user_id": row["user_id"],
        "title": row["title"],
        "community_name": row["community_name"],
        "grant_name": row["grant_name"],
        "status": row["status"],
        "current_step": row["current_step"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "last_exported_at": row["last_exported_at"],
    }
    if include_payload:
        proposal.update(
            {
                "requirements": _json_load(row["requirements_json"]),
                "profile": _json_load(row["profile_json"]),
                "draft": _json_load(row["draft_json"]),
                "enhanced": _json_load(row["enhanced_json"]),
                "structured_answers": _json_load(row["structured_answers_json"]),
                "prompt_coverage": _json_load(row["prompt_coverage_json"]),
                "validation": _json_load(row["validation_json"]),
                "final_sections": _json_load(row["final_sections_json"]),
                "community_profile_id": row["community_profile_id"],
                "community_profile_snapshot": _json_load(row["community_profile_snapshot_json"]),
                "application_details": _json_load(row["application_details_json"]),
            }
        )
    return proposal


def _row_to_feedback_report(row: Any, *, include_payload: bool) -> dict[str, Any]:
    report = {
        "id": row["id"],
        "user_id": row["user_id"],
        "source_proposal_id": row["source_proposal_id"],
        "parent_report_id": row["parent_report_id"],
        "title": row["title"],
        "source_filename": row["source_filename"],
        "status": row["status"],
        "rubric_version": row["rubric_version"],
        "overall_score": row["overall_score"],
        "priority_issue_count": row["priority_issue_count"],
        "category_scores": _json_load(row["category_scores_json"]) or {},
        "created_at": row["created_at"],
        "analyzed_at": row["analyzed_at"],
    }
    if include_payload:
        report.update(
            {
                "report": _json_load(row["report_json"]) or {},
                "extracted_sections": _json_load(row["extracted_sections_json"]) or [],
                "grant_context": _json_load(row["grant_context_json"]),
            }
        )
    return report
