# GreenTrack — Design Documentation

---

## Problem Statement

Small sustainability-focused organizations — non-profits managing donated goods, cafes tracking perishables, university labs managing equipment — waste money and generate unnecessary emissions through poor inventory management. They over-order (generating waste), under-order (causing operational disruption), and buy from low-sustainability suppliers by default — not because they lack discipline, but because they lack tools that surface the right insight at the right time.

**GreenTrack** is an AI-powered inventory assistant that solves this by combining rule-based reliability with LLM-powered contextual reasoning, making smart inventory decisions accessible without requiring data science expertise.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (HTTPS)                       │
│              React 18 + TypeScript + Tailwind            │
│                                                          │
│   Dashboard → InventoryTable → AIInsightsPanel           │
│                             → PortfolioSummaryModal      │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS (self-signed TLS)
                        │ JWT Bearer token on every request
                        ▼
┌─────────────────────────────────────────────────────────┐
│              FastAPI + Uvicorn (Python 3.11+)            │
│                   https://localhost:3001                  │
│                                                          │
│  /api/auth/*      JWT login, signup, user management     │
│  /api/inventory/* CRUD with server-side validation       │
│  /api/ai/*        Insights, bulk, portfolio, categorize  │
│  /health          Liveness probe                         │
│                                                          │
│  Middleware: CORS, slowapi rate limiting                 │
└──────────┬────────────────────────┬─────────────────────┘
           │                        │
           ▼                        ▼
┌──────────────────┐     ┌─────────────────────────────┐
│  SQLite Database │     │   Groq API (external)        │
│  inventory.db    │     │   llama-3.3-70b-versatile    │
│                  │     │                              │
│  - inventory     │     │  If unavailable → fallback   │
│  - users         │     │  service handles response    │
└──────────────────┘     └─────────────────────────────┘
```

### Request Flow — AI Insights

```
User clicks "AI Insights"
        │
        ▼
GET /api/ai/insights/:id?mode=ai|rule
        │
        ├─ mode=rule → fallback_service.py → deterministic calculation → response
        │
        └─ mode=ai  → ai_service.py
                          │
                          ├─ No GROQ_API_KEY → fallback_service.py
                          │
                          ├─ Groq call succeeds + valid JSON → return with source="ai"
                          │
                          └─ Groq fails / invalid response → fallback_service.py → source="fallback"
```

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 18 + TypeScript | Component model suits modular UI; TypeScript catches shape mismatches at compile time, especially important for AI response types |
| Styling | Tailwind CSS | Utility-first; no design system overhead; consistent spacing and colour tokens |
| Bundler | Vite | Fast HMR; native HTTPS proxy support for local dev |
| Backend | Python + FastAPI | Automatic OpenAPI docs at `/docs`; Pydantic request validation; clean dependency injection for test isolation; Python is the dominant language for AI/ML tooling |
| Server | Uvicorn (ASGI) | Native SSL/TLS support; async-ready for future non-blocking DB calls |
| Database | SQLite | Zero-config, file-based; right-sized for target organizations; SQL is ANSI-compatible so a PostgreSQL migration is a driver swap |
| AI | Groq (`llama-3.3-70b-versatile`) | Fast inference; free tier; strong structured JSON output; open model |
| Auth | PyJWT + bcrypt | Stateless JWT; bcrypt for password hashing; no external auth service dependency |
| Rate Limiting | slowapi | Per-route limits; protects AI endpoints from runaway usage |
| Testing | pytest + FastAPI TestClient | In-memory SQLite test database; no production data touched; module-scoped fixture for speed |

---

## Component Design

### Backend Services

**`ai_service.py`**
- `generate_ai_insights(item)` — sends a single item to Groq with a prompt engineered for contextual urgency reasoning (not just threshold comparison). Returns structured JSON matching `InsightResult`.
- `generate_portfolio_summary(items)` — sends the full inventory to Groq in a single prompt, asking for cross-item opportunities that rule engines cannot detect: order consolidation, hidden risks, sustainability wins, unusual patterns.
- `categorize_item_with_ai(name, notes)` — classifies a new item into one of 5 categories based on name and free-text notes.

**`fallback_service.py`**
- `generate_fallback_insights(item)` — deterministic calculation: `daysUntilEmpty = quantity / dailyUsageRate`, urgency from threshold and expiry comparisons, contextual messages from score ranges. Returns the exact same schema as the AI service so the UI is unaware of the source.

The fallback mirrors the AI response schema intentionally. Any schema divergence would require UI branching — keeping them identical means the frontend only needs to check `source` for cosmetic differences (badge colour, showing/hiding the reasoning callout).

### Frontend Components

| Component | Responsibility |
|---|---|
| `App.tsx` | Root state, auth check, all async handlers |
| `Dashboard.tsx` | Aggregate stats: total items, reorder count, avg eco-score, expiring soon |
| `InventoryTable.tsx` | Item rows with edit/delete/insights/buy-now actions |
| `AIInsightsPanel.tsx` | Side drawer: rule/AI toggle, urgency display, reasoning callout, sparkline chart, sustainability tip, alternative suppliers |
| `PortfolioSummaryModal.tsx` | Full-inventory AI analysis: headline, order consolidation, hidden risks, sustainability wins, unusual patterns |
| `AddEditModal.tsx` | Create/edit form with client-side validation and AI auto-categorize |
| `SearchFilter.tsx` | Search + category + low-stock filter bar |
| `LoginPage.tsx` | JWT login form |
| `UsersPanel.tsx` | User management: add/remove users |

### AI Insights Panel — Mode Design

The toggle between Rule-based and AI modes was a deliberate design decision to make the AI's value explicit:

```
Rule-based shows:          AI (Groq) additionally shows:
─────────────────          ────────────────────────────
• Days until empty         • Urgency reasoning in plain English
• Urgency level            • Sustainability tip specific to the item
• Reorder message          • 3 alternative eco-conscious suppliers
• 14-day usage chart       • Purple tinting on urgency (visual source cue)
```

The chart appears in both modes because projection math (`quantity - i × dailyUsageRate`) is deterministic — attributing it exclusively to AI would be misleading.

---

## Key Design Decisions

### 1. Contextual urgency over fixed thresholds

The original fallback service determines urgency by comparing `quantity` to `reorderThreshold`. The Groq prompt explicitly instructs the model to reason beyond this:

> "How critical is this item to daily operations given its category? How hard is it to replace quickly? Does the expiry date change how urgently action is needed? Do the notes mention anything affecting urgency?"

This means an item with `quantity > reorderThreshold` can still be rated `critical` if the notes say "only one regional distributor" or the category is critical lab equipment with a long lead time.

### 2. Optional AI key — AI as enhancement, not dependency

The entire application is usable without a Groq API key. Rule-based fallback is always active. This was a deliberate product decision: small organizations shouldn't be blocked from using the tool because of API costs or key management friction.

### 3. Silent fallback over hard failure

Any field added to the AI response's `required` validation list that Groq doesn't consistently return will silently degrade every AI response to rule-based. This was observed in development: adding `urgencyReason` to `required` caused 100% fallback until removed.

**Pattern established:** only structural fields (`daysUntilEmpty`, `needsReorder`, `urgency`, `reorderMessage`, `sustainabilityTip`) are required. Enrichment fields (`urgencyReason`, `dailyProjection`, `alternativeSuppliers`) are optional — rendered when present, omitted when absent. The UI never breaks.

### 4. On-demand insights, not automatic

Pre-computing insights on every page load would make 15+ Groq calls per visit, exhausting the free tier within minutes. Insights are triggered by user intent: clicking the sparkle icon on an item, or clicking "Refresh AI Alerts" for a bulk scan.

### 5. Cross-inventory portfolio summary

Per-item insights are useful but miss cross-item opportunities: two items from the same supplier that could be consolidated into one order, three perishables expiring the same week, all lab equipment low simultaneously. These patterns require reasoning across the entire inventory at once — something a rule engine cannot do without hard-coding every possible relationship.

The portfolio summary sends all items in a single Groq prompt and asks for these cross-item insights explicitly. This is the feature that most clearly differentiates AI from rules.

### 6. Source transparency

Every insight response includes a `source` field (`"ai"` or `"fallback"`). The UI renders a visible badge and adjusts styling (purple tinting for AI, grey for fallback) so users always know what they're looking at. No silent degradation from the user's perspective.

---

## Database Schema

```sql
CREATE TABLE inventory (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT NOT NULL,
    category          TEXT NOT NULL,
    quantity          REAL NOT NULL,
    unit              TEXT NOT NULL,
    reorderThreshold  REAL NOT NULL,
    expiryDate        TEXT,
    lastRestocked     TEXT NOT NULL,
    dailyUsageRate    REAL NOT NULL,
    supplier          TEXT NOT NULL DEFAULT '',
    sustainabilityScore INTEGER NOT NULL DEFAULT 5,
    notes             TEXT NOT NULL DEFAULT '',
    createdAt         TEXT NOT NULL,
    updatedAt         TEXT NOT NULL
);

CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    createdAt     TEXT NOT NULL
);
```

---

## Security Design

| Concern | Approach |
|---|---|
| Authentication | JWT Bearer tokens on all API routes; tokens expire; 401 triggers client-side re-login |
| Password storage | bcrypt hashing — never stored in plaintext |
| Transport security | HTTPS everywhere (self-signed cert for dev, Let's Encrypt for prod) |
| API key storage | `server/.env` only; gitignored; never in code or client bundle |
| Rate limiting | 200 req/15min on inventory routes; 30 req/15min on AI insights; 10 req/15min on portfolio summary |
| Input validation | Server-side Pydantic + manual checks on all POST/PUT fields |
| CORS | Explicit allowlist (`localhost:5173` only) — no wildcard origins |
| External links | `rel="noopener noreferrer"` on all `target="_blank"` anchors |

---

## Responsible AI Considerations

**Transparency** — Users always see whether insights came from AI or the rule engine. The toggle makes the difference explicit rather than hiding it.

**Graceful degradation** — The app never fails because the AI is unavailable. Fallback provides useful, deterministic results at all times.

**Rate limiting** — AI endpoints are rate-limited independently to prevent accidental cost runaway. The portfolio summary endpoint has the most restrictive limit (10/15min) because it's the most expensive call.

**No PII in prompts** — Inventory data sent to Groq contains item names, quantities, categories, and notes. No user emails, passwords, or personal data are included in any AI prompt.

**Honest uncertainty** — The AI reasoning callout shows the model's justification for its urgency decision, making it auditable. Users can disagree and consult the rule-based mode for comparison.

---

## Future Enhancements

### Near-Term
| Enhancement | Value |
|---|---|
| Expiry notifications | Email or push alerts when items are within N days of expiry |
| Usage history logging | Record quantity changes over time; feed actual (not estimated) usage rates into AI prompts |
| CSV import/export | Bulk-load from spreadsheets; export for reporting |
| Sustainability impact dashboard | Aggregate carbon savings from waste reduction and eco-supplier choices |

### AI Improvements
| Enhancement | Value |
|---|---|
| Conversational interface | Natural language queries ("What's running low this week?") via a chat widget |
| Photo-based item detection | Identify items from a shelf photo and auto-populate the add form (vision model) |
| Demand forecasting | Feed seasonal patterns and event calendars into prompts for smarter reorder timing |
| Supplier recommendation engine | Cross-reference item categories with a curated database of eco-certified suppliers |

### Infrastructure
| Enhancement | Value |
|---|---|
| PostgreSQL migration | Concurrent writes for multi-user, multi-site deployments |
| Docker Compose | Single-command deployment; eliminates environment setup friction |
| Production TLS | Let's Encrypt via Certbot replaces self-signed cert |
| Background insight jobs | Pre-compute and cache insights on a schedule rather than on-demand |
| Role-based access | Admin vs. viewer roles; audit log for inventory changes |

---

## Tradeoffs Summary

| Decision | Chosen | At Scale |
|---|---|---|
| Database | SQLite (zero-config) | PostgreSQL for concurrent writes |
| AI provider | Groq free tier | Groq or fine-tuned model for domain-specific reasoning |
| Insight timing | On-demand | Background job with result caching |
| TLS | Self-signed cert | Let's Encrypt via Certbot |
| Deployment | Local dev | Docker Compose → Kubernetes |
| Auth | Single-role JWT | Role-based access control + audit log |

---

*GreenTrack — Palo Alto Networks New Grad SWE Take-Home Case Study*