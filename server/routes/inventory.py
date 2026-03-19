import sqlite3
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, Response

from auth import get_current_user
from database import get_db
from limiter import limiter
from models import InventoryItemCreate, InventoryItemUpdate

router = APIRouter()

VALID_CATEGORIES = [
    "Office Supplies",
    "Perishable Food",
    "Cleaning Supplies",
    "Lab Equipment",
    "Electronics",
]


def row_to_dict(row: sqlite3.Row) -> dict:
    return dict(row)


def validate_create(data: InventoryItemCreate) -> Optional[str]:
    if not data.name or not data.name.strip():
        return "Name is required"
    if data.quantity < 0:
        return "Quantity must be >= 0"
    if data.dailyUsageRate <= 0:
        return "Daily usage rate must be > 0"
    if data.category not in VALID_CATEGORIES:
        return f"Category must be one of: {', '.join(VALID_CATEGORIES)}"
    if not data.unit or not data.unit.strip():
        return "Unit is required"
    if not data.supplier or not data.supplier.strip():
        return "Supplier is required"
    if not data.lastRestocked:
        return "Last restocked date is required"
    if not (1 <= data.sustainabilityScore <= 10):
        return "Sustainability score must be between 1 and 10"
    return None


@router.get("")
@limiter.limit("200/15minutes")
def get_inventory(
    request: Request,
    search: Optional[str] = None,
    category: Optional[str] = None,
    lowStock: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db),
    _: str = Depends(get_current_user),
):
    query = "SELECT * FROM inventory WHERE 1=1"
    params = []

    if search:
        query += " AND (LOWER(name) LIKE ? OR LOWER(category) LIKE ?)"
        params.extend([f"%{search.lower()}%", f"%{search.lower()}%"])

    if category:
        query += " AND category = ?"
        params.append(category)

    if lowStock and lowStock.lower() == "true":
        query += " AND quantity <= reorderThreshold"

    rows = db.execute(query, params).fetchall()
    return [row_to_dict(r) for r in rows]


@router.get("/{item_id}")
@limiter.limit("200/15minutes")
def get_item(request: Request, item_id: int, db: sqlite3.Connection = Depends(get_db), _: str = Depends(get_current_user)):
    row = db.execute("SELECT * FROM inventory WHERE id = ?", [item_id]).fetchone()
    if not row:
        return JSONResponse(status_code=404, content={"error": f"Item {item_id} not found"})
    return row_to_dict(row)


@router.post("")
@limiter.limit("200/15minutes")
def create_item(
    request: Request,
    data: InventoryItemCreate,
    db: sqlite3.Connection = Depends(get_db),
    _: str = Depends(get_current_user),
):
    error = validate_create(data)
    if error:
        return JSONResponse(status_code=400, content={"error": error})

    now = datetime.now(timezone.utc).isoformat()
    cursor = db.execute(
        """
        INSERT INTO inventory (
            name, category, quantity, unit, reorderThreshold, expiryDate,
            lastRestocked, dailyUsageRate, supplier, sustainabilityScore,
            notes, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data.name.strip(), data.category, data.quantity, data.unit.strip(),
            data.reorderThreshold, data.expiryDate, data.lastRestocked,
            data.dailyUsageRate, data.supplier.strip(), data.sustainabilityScore,
            data.notes, now, now,
        ),
    )
    db.commit()
    row = db.execute("SELECT * FROM inventory WHERE id = ?", [cursor.lastrowid]).fetchone()
    return JSONResponse(status_code=201, content=row_to_dict(row))


@router.put("/{item_id}")
@limiter.limit("200/15minutes")
def update_item(
    request: Request,
    item_id: int,
    data: InventoryItemUpdate,
    db: sqlite3.Connection = Depends(get_db),
    _: str = Depends(get_current_user),
):
    existing = db.execute("SELECT * FROM inventory WHERE id = ?", [item_id]).fetchone()
    if not existing:
        return JSONResponse(status_code=404, content={"error": f"Item {item_id} not found"})

    updates = data.model_dump(exclude_unset=True)
    if not updates:
        return row_to_dict(existing)

    now = datetime.now(timezone.utc).isoformat()
    updates["updatedAt"] = now

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [item_id]
    db.execute(f"UPDATE inventory SET {set_clause} WHERE id = ?", values)
    db.commit()

    row = db.execute("SELECT * FROM inventory WHERE id = ?", [item_id]).fetchone()
    return row_to_dict(row)


@router.delete("/{item_id}")
@limiter.limit("200/15minutes")
def delete_item(request: Request, item_id: int, db: sqlite3.Connection = Depends(get_db), _: str = Depends(get_current_user)):
    existing = db.execute("SELECT * FROM inventory WHERE id = ?", [item_id]).fetchone()
    if not existing:
        return JSONResponse(status_code=404, content={"error": f"Item {item_id} not found"})
    db.execute("DELETE FROM inventory WHERE id = ?", [item_id])
    db.commit()
    return Response(status_code=204)
