import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone

os.environ.setdefault("ADMIN_EMAIL", "testadmin@greentrack.com")
os.environ.setdefault("ADMIN_PASSWORD", "testpassword123")
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-tests-only")

from database import init_db, get_db
from main import app


def now_iso():
    return datetime.now(timezone.utc).isoformat()


@pytest.fixture(scope="module")
def client():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        test_db_path = f.name

    test_conn = init_db(test_db_path)

    def override_get_db():
        yield test_conn

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        # Get the seeded admin's ID and generate a token directly (avoids rate limiter)
        from auth import create_access_token
        row = test_conn.execute("SELECT id FROM users WHERE email = ?", [os.environ["ADMIN_EMAIL"].lower()]).fetchone()
        token = create_access_token(subject=str(row["id"]))
        c.headers.update({"Authorization": f"Bearer {token}"})
        yield c

    app.dependency_overrides.clear()
    test_conn.close()
    try:
        os.unlink(test_db_path)
    except Exception:
        pass


# ── GET /api/inventory ────────────────────────────────────────────────────────

class TestGetInventory:
    def test_returns_200_and_array(self, client):
        res = client.get("/api/inventory")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_filter_by_category(self, client):
        res = client.get("/api/inventory?category=Office Supplies")
        assert res.status_code == 200
        for item in res.json():
            assert item["category"] == "Office Supplies"

    def test_filter_by_low_stock(self, client):
        res = client.get("/api/inventory?lowStock=true")
        assert res.status_code == 200
        for item in res.json():
            assert item["quantity"] <= item["reorderThreshold"]

    def test_requires_auth(self, client):
        res = client.get("/api/inventory", headers={"Authorization": ""})
        assert res.status_code == 403


# ── POST /api/inventory ───────────────────────────────────────────────────────

class TestCreateInventory:
    def test_creates_item_with_valid_data(self, client):
        res = client.post("/api/inventory", json={
            "name": "Test Eco Notebook",
            "category": "Office Supplies",
            "quantity": 20,
            "unit": "notebooks",
            "reorderThreshold": 5,
            "expiryDate": None,
            "lastRestocked": now_iso(),
            "dailyUsageRate": 0.5,
            "supplier": "EcoWrite Ltd",
            "sustainabilityScore": 8,
            "notes": "Recycled paper, spiral bound",
        })
        assert res.status_code == 201
        body = res.json()
        assert "id" in body
        assert body["name"] == "Test Eco Notebook"
        assert body["quantity"] == 20
        assert body["sustainabilityScore"] == 8
        assert "createdAt" in body
        assert "updatedAt" in body

    def test_returns_400_when_name_missing(self, client):
        res = client.post("/api/inventory", json={
            "name": "",
            "category": "Office Supplies",
            "quantity": 10,
            "unit": "boxes",
            "reorderThreshold": 2,
            "lastRestocked": now_iso(),
            "dailyUsageRate": 0.3,
            "supplier": "Test Supplier",
            "sustainabilityScore": 5,
            "notes": "",
        })
        assert res.status_code == 400
        assert "Name" in res.json()["error"]

    def test_returns_400_when_quantity_negative(self, client):
        res = client.post("/api/inventory", json={
            "name": "Negative Item",
            "category": "Office Supplies",
            "quantity": -5,
            "unit": "boxes",
            "reorderThreshold": 2,
            "lastRestocked": now_iso(),
            "dailyUsageRate": 0.3,
            "supplier": "Test Supplier",
            "sustainabilityScore": 5,
            "notes": "",
        })
        assert res.status_code == 400
        assert "Quantity" in res.json()["error"]

    def test_returns_400_when_daily_usage_zero(self, client):
        res = client.post("/api/inventory", json={
            "name": "Zero Usage Item",
            "category": "Electronics",
            "quantity": 5,
            "unit": "units",
            "reorderThreshold": 1,
            "lastRestocked": now_iso(),
            "dailyUsageRate": 0,
            "supplier": "Tech Supplier",
            "sustainabilityScore": 5,
            "notes": "",
        })
        assert res.status_code == 400
        assert "usage rate" in res.json()["error"]


# ── GET /api/inventory/:id ────────────────────────────────────────────────────

class TestGetItem:
    def test_returns_404_for_nonexistent_id(self, client):
        res = client.get("/api/inventory/999999")
        assert res.status_code == 404
        assert "999999" in res.json()["error"]

    def test_returns_item_when_exists(self, client):
        create = client.post("/api/inventory", json={
            "name": "Findable Item",
            "category": "Lab Equipment",
            "quantity": 3,
            "unit": "units",
            "reorderThreshold": 1,
            "lastRestocked": now_iso(),
            "dailyUsageRate": 0.1,
            "supplier": "Lab Co.",
            "sustainabilityScore": 6,
            "notes": "For testing retrieval",
        })
        assert create.status_code == 201
        item_id = create.json()["id"]

        res = client.get(f"/api/inventory/{item_id}")
        assert res.status_code == 200
        assert res.json()["id"] == item_id
        assert res.json()["name"] == "Findable Item"


# ── PUT /api/inventory/:id ────────────────────────────────────────────────────

class TestUpdateItem:
    def test_updates_existing_item(self, client):
        create = client.post("/api/inventory", json={
            "name": "Updatable Item",
            "category": "Cleaning Supplies",
            "quantity": 10,
            "unit": "bottles",
            "reorderThreshold": 3,
            "lastRestocked": now_iso(),
            "dailyUsageRate": 0.5,
            "supplier": "Clean Co.",
            "sustainabilityScore": 7,
            "notes": "",
        })
        item_id = create.json()["id"]

        res = client.put(f"/api/inventory/{item_id}", json={
            "quantity": 25,
            "sustainabilityScore": 9,
        })
        assert res.status_code == 200
        assert res.json()["quantity"] == 25
        assert res.json()["sustainabilityScore"] == 9
        assert res.json()["name"] == "Updatable Item"

    def test_returns_404_for_nonexistent_item(self, client):
        res = client.put("/api/inventory/999999", json={"quantity": 10})
        assert res.status_code == 404


# ── DELETE /api/inventory/:id ─────────────────────────────────────────────────

class TestDeleteItem:
    def test_deletes_item_and_returns_204(self, client):
        create = client.post("/api/inventory", json={
            "name": "Deletable Item",
            "category": "Office Supplies",
            "quantity": 5,
            "unit": "pcs",
            "reorderThreshold": 1,
            "lastRestocked": now_iso(),
            "dailyUsageRate": 0.2,
            "supplier": "Supply Co.",
            "sustainabilityScore": 5,
            "notes": "",
        })
        item_id = create.json()["id"]

        delete_res = client.delete(f"/api/inventory/{item_id}")
        assert delete_res.status_code == 204

        get_res = client.get(f"/api/inventory/{item_id}")
        assert get_res.status_code == 404

    def test_returns_404_for_nonexistent_item(self, client):
        res = client.delete("/api/inventory/999999")
        assert res.status_code == 404


# ── GET /health ───────────────────────────────────────────────────────────────

class TestHealth:
    def test_returns_200_with_status_ok(self, client):
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
        assert "timestamp" in res.json()