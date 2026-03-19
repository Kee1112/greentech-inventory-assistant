import sqlite3

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse

from auth import get_current_user
from database import get_db
from limiter import limiter
from models import CategorizeRequest
from services.ai_service import generate_ai_insights, categorize_item_with_ai, generate_portfolio_summary
from services.fallback_service import generate_fallback_insights

router = APIRouter()


def row_to_dict(row: sqlite3.Row) -> dict:
    return dict(row)


@router.post("/insights/{item_id}")
@limiter.limit("30/15minutes")
def get_insights(
    request: Request,
    item_id: int,
    mode: str = Query("ai"),
    db: sqlite3.Connection = Depends(get_db),
    _: str = Depends(get_current_user),
):
    row = db.execute("SELECT * FROM inventory WHERE id = ?", [item_id]).fetchone()
    if not row:
        return JSONResponse(status_code=404, content={"error": f"Item {item_id} not found"})
    item = row_to_dict(row)
    if mode == "rule":
        return generate_fallback_insights(item)
    return generate_ai_insights(item)


@router.post("/bulk-insights")
@limiter.limit("30/15minutes")
def bulk_insights(request: Request, db: sqlite3.Connection = Depends(get_db), _: str = Depends(get_current_user)):
    rows = db.execute("SELECT * FROM inventory").fetchall()
    return [
        {"item": row_to_dict(row), "insight": generate_fallback_insights(row_to_dict(row))}
        for row in rows
    ]


@router.post("/portfolio-summary")
@limiter.limit("10/15minutes")
def portfolio_summary(request: Request, db: sqlite3.Connection = Depends(get_db), _: str = Depends(get_current_user)):
    rows = db.execute("SELECT * FROM inventory").fetchall()
    items = [row_to_dict(r) for r in rows]
    return generate_portfolio_summary(items)


@router.post("/categorize")
@limiter.limit("30/15minutes")
def categorize(
    request: Request,
    data: CategorizeRequest,
    db: sqlite3.Connection = Depends(get_db),
    _: str = Depends(get_current_user),
):
    if not data.name or not data.name.strip():
        return JSONResponse(status_code=400, content={"error": "Name is required for categorization"})
    return {"category": categorize_item_with_ai(data.name, data.notes or "")}
