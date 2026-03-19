# GreenTrack — Intelligent Inventory Assistant

**Candidate Name:** Keerthana R
**Scenario Chosen:** Green-Tech Inventory Assistant
**Estimated Time Spent:** 6 hours

---

## Quick Start

**Prerequisites:**
- Node.js 18+
- Python 3.11+
- A free [Groq API key](https://console.groq.com) (optional — app runs in rule-based fallback mode without one)

**Run Commands:**
```bash
# 1. Install backend dependencies
cd server && pip install -r requirements.txt

# 2. Generate SSL certificate
python generate_cert.py

# 3. Configure environment
cp ../.env.example .env
# Edit server/.env — set GROQ_API_KEY, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

# 4. Install frontend dependencies
cd ../client && npm install

# Terminal 1 — backend
cd server && python main.py
# → https://localhost:3001

# Terminal 2 — frontend
cd client && npm run dev
# → https://localhost:5173
```

Open [https://localhost:5173](https://localhost:5173). Accept the self-signed certificate warning (Advanced → Proceed). Log in with the credentials set in `server/.env`.

**Test Commands:**
```bash
cd server && python -m pytest tests/ -v
# 33 tests — all passing
```

---

## AI Disclosure

**Did you use an AI assistant (Copilot, ChatGPT, etc.)?**
Yes — Claude and Gemini

**How did you verify the suggestions?**
Every feature was verified by running the app in the browser and confirming the behaviour end-to-end. 
For backend changes I checked the FastAPI `/docs` page to confirm routes were registered and ran the test suite after each change. 
When AI-generated Groq prompts were involved, I tested with real API calls and inspected the raw responses to confirm the JSON structure matched what the frontend expected.

**Give one example of a suggestion you rejected or changed:**
 Claude suggested pre-computing AI insights for all items automatically on every page load so results would be instantly available. I changed this to on-demand fetching — triggered only when a user clicks into an item or hits "Refresh AI Alerts." Pre-computing on load would fire 15+ Groq API calls per visit, exhausting the free-tier rate limit

I also added slowapi rate limiting on the AI endpoints myself — this wasn't part of the initial implementation. Without it, a user could repeatedly hit the Groq endpoints and burn through the free-tier quota unintentionally. I set stricter limits on the more expensive calls (10 requests/15min for portfolio summary vs. 30/15min for per-item insights) to reflect the actual cost difference.

---

## Tradeoffs & Prioritization

**What did you cut to stay within the 4–6 hour limit?**
- No usage history logging — daily usage rate is a static field rather than computed from a change log. This means the AI projections are estimates, not data-driven forecasts.
- No email/push notifications for expiring items — the dashboard flags items expiring within 7 days but doesn't proactively alert users.
- No CSV import/export — bulk data entry requires the form UI.
- SQLite instead of PostgreSQL — acceptable for the target org size but not suitable for concurrent multi-site writes.

**What would you build next if you had more time?**
- **Usage history + actual usage rates** — log every quantity change and compute real daily usage; feed the history into the AI prompt for more accurate forecasting.
- **Expiry notifications** — scheduled background job that emails users when items are within N days of expiry.
- **Conversational interface** — a chat widget backed by Groq tool use so users can query the inventory in natural language ("What's running low this week?").
- **PostgreSQL migration** — replace SQLite with a proper database server to handle multiple users writing at the same time, which SQLite doesn't support well at scale.
- **Docker Compose** — single-command deployment to remove environment setup friction.

**Known limitations:**
- Self-signed TLS certificate — browsers show a one-time warning; replace with Let's Encrypt for production.
- SQLite does not support concurrent writes — fine for small teams, needs PostgreSQL at scale.
- Groq free tier rate limits (30 req/15min for insights, 10 req/15min for portfolio summary) — sufficient for demo use, would need a paid plan for production traffic.
- Daily usage rate is user-supplied, not calculated from historical data — AI projections are only as accurate as the input.

---

## Features Built

- **Full CRUD** inventory management with search, category filter, and low-stock filter
- **JWT authentication** — login, signup, user management panel
- **Dashboard** — total items, reorder-needed count, average sustainability score, expiring-soon count
- **AI Insights (per item)** — rule-based and Groq modes with a visible toggle; contextual urgency reasoning; 14-day usage projection sparkline; sustainability tip; alternative supplier suggestions
- **AI Portfolio Summary** — cross-inventory analysis: order consolidation opportunities, hidden risks, sustainability wins, unusual patterns
- **Buy Now button** — low-stock items link directly to an Amazon India search for that item
- **Bulk Alert Refresh** — scans all items and surfaces critical/warning alerts as toast notifications
- **AI Auto-Categorize** — suggests a category when adding a new item based on name and notes
- **Responsible AI design** — silent fallback when Groq is unavailable; source badge on every insight; rate limiting on all AI endpoints; no PII in prompts
- **33 automated tests** — happy paths and edge cases across inventory CRUD, auth, and validation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Bundler | Vite (HTTPS + proxy) |
| Backend | Python + FastAPI + Uvicorn |
| Database | SQLite |
| AI | Groq (`llama-3.3-70b-versatile`) |
| Auth | PyJWT + bcrypt |
| Rate Limiting | slowapi |
| Testing | pytest + FastAPI TestClient |

Full design details, architecture diagram, component breakdown, and security design are in [DESIGN.md](DESIGN.md).

---

*Built by Keerthana R — Palo Alto Networks Case Study*