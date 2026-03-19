import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr

from auth import verify_password, hash_password, create_access_token, get_current_user
from database import get_db
from limiter import limiter
import sqlite3

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, data: LoginRequest, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute("SELECT * FROM users WHERE email = ?", [data.email.lower()]).fetchone()
    if not row or not verify_password(data.password, row["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_access_token(subject=str(row["id"]))
    return JSONResponse(content={"access_token": token, "token_type": "bearer"})


@router.get("/me")
def me(current_user_id: str = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    row = db.execute("SELECT id, email, createdAt FROM users WHERE id = ?", [current_user_id]).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)


@router.get("/users")
def list_users(_: str = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT id, email, createdAt FROM users ORDER BY createdAt ASC").fetchall()
    return [dict(r) for r in rows]


@router.post("/signup")
@limiter.limit("5/minute")
def signup(request: Request, data: CreateUserRequest, db: sqlite3.Connection = Depends(get_db)):
    if not data.password or len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    existing = db.execute("SELECT id FROM users WHERE email = ?", [data.email.lower()]).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    now = datetime.now(timezone.utc).isoformat()
    cursor = db.execute(
        "INSERT INTO users (email, password_hash, createdAt) VALUES (?, ?, ?)",
        [data.email.lower(), hash_password(data.password), now],
    )
    db.commit()
    token = create_access_token(subject=str(cursor.lastrowid))
    return JSONResponse(status_code=201, content={"access_token": token, "token_type": "bearer"})


@router.post("/users")
def create_user(
    data: CreateUserRequest,
    _: str = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if not data.password or len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    existing = db.execute("SELECT id FROM users WHERE email = ?", [data.email.lower()]).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    now = datetime.now(timezone.utc).isoformat()
    cursor = db.execute(
        "INSERT INTO users (email, password_hash, createdAt) VALUES (?, ?, ?)",
        [data.email.lower(), hash_password(data.password), now],
    )
    db.commit()
    return JSONResponse(
        status_code=201,
        content={"id": cursor.lastrowid, "email": data.email.lower(), "createdAt": now},
    )


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user_id: str = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if str(user_id) == current_user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    total = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if total <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last user")
    existing = db.execute("SELECT id FROM users WHERE id = ?", [user_id]).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    db.execute("DELETE FROM users WHERE id = ?", [user_id])
    db.commit()
    from fastapi.responses import Response
    return Response(status_code=204)