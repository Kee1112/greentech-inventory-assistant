import sqlite3
import json
import os
import bcrypt
from pathlib import Path
from datetime import datetime, timezone
from typing import Generator, Optional

DB_PATH = os.getenv("DB_PATH", str(Path(__file__).parent / "inventory.db"))
SAMPLE_DATA_PATH = Path(__file__).parent.parent / "data" / "sample_inventory.json"

_default_conn: Optional[sqlite3.Connection] = None


def init_db(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            createdAt TEXT NOT NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            quantity REAL NOT NULL DEFAULT 0,
            unit TEXT NOT NULL,
            reorderThreshold REAL NOT NULL DEFAULT 0,
            expiryDate TEXT,
            lastRestocked TEXT NOT NULL,
            dailyUsageRate REAL NOT NULL DEFAULT 0,
            supplier TEXT NOT NULL,
            sustainabilityScore INTEGER NOT NULL DEFAULT 5,
            notes TEXT NOT NULL DEFAULT '',
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL
        )
    """)
    conn.commit()

    # Seed first admin user from env if no users exist
    user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if user_count == 0:
        admin_email = os.getenv("ADMIN_EMAIL", "admin@greentrack.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "greentrack2024")
        password_hash = bcrypt.hashpw(admin_password.encode(), bcrypt.gensalt()).decode()
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO users (email, password_hash, createdAt) VALUES (?, ?, ?)",
            [admin_email.lower(), password_hash, now],
        )
        conn.commit()
        print(f"[DB] Created default admin user: {admin_email}")

    count = conn.execute("SELECT COUNT(*) FROM inventory").fetchone()[0]
    if count == 0 and SAMPLE_DATA_PATH.exists():
        with open(SAMPLE_DATA_PATH) as f:
            items = json.load(f)
        now = datetime.now(timezone.utc).isoformat()
        conn.executemany(
            """
            INSERT INTO inventory (
                name, category, quantity, unit, reorderThreshold, expiryDate,
                lastRestocked, dailyUsageRate, supplier, sustainabilityScore,
                notes, createdAt, updatedAt
            ) VALUES (
                :name, :category, :quantity, :unit, :reorderThreshold, :expiryDate,
                :lastRestocked, :dailyUsageRate, :supplier, :sustainabilityScore,
                :notes, :createdAt, :updatedAt
            )
            """,
            [{**item, "createdAt": now, "updatedAt": now} for item in items],
        )
        conn.commit()

    return conn


def _get_default_conn() -> sqlite3.Connection:
    global _default_conn
    if _default_conn is None:
        _default_conn = init_db(DB_PATH)
    return _default_conn


def get_db() -> Generator[sqlite3.Connection, None, None]:
    yield _get_default_conn()
