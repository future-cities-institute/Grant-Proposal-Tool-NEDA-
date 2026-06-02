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
                prompt_coverage_json TEXT,
                validation_json TEXT,
                final_sections_json TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_exported_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """,
        )
        _run(
            conn,
            "CREATE INDEX IF NOT EXISTS idx_proposals_user_updated ON proposals(user_id, updated_at DESC)",
        )


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
                prompt_coverage_json, validation_json, final_sections_json,
                created_at, updated_at, last_exported_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                _json_dump(payload.get("prompt_coverage")),
                _json_dump(payload.get("validation")),
                _json_dump(payload.get("final_sections")),
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
                prompt_coverage_json = ?, validation_json = ?, final_sections_json = ?,
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
                _json_dump(merged.get("prompt_coverage")),
                _json_dump(merged.get("validation")),
                _json_dump(merged.get("final_sections")),
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
                "prompt_coverage": _json_load(row["prompt_coverage_json"]),
                "validation": _json_load(row["validation_json"]),
                "final_sections": _json_load(row["final_sections_json"]),
            }
        )
    return proposal
