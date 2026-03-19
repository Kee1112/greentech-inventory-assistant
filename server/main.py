from dotenv import load_dotenv
from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from limiter import limiter
from routes.inventory import router as inventory_router
from routes.ai import router as ai_router
from routes.auth import router as auth_router

app = FastAPI(title="GreenTrack API", redirect_slashes=False)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_extra_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://localhost:5173",
        "https://127.0.0.1:5173",
        *_extra_origins,
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(auth_router, prefix="/api/auth")
app.include_router(inventory_router, prefix="/api/inventory")
app.include_router(ai_router, prefix="/api/ai")


@app.get("/health")
def health():
    from datetime import datetime, timezone
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


if __name__ == "__main__":
    import uvicorn
    from pathlib import Path

    port = int(os.getenv("PORT", "3001"))
    cert_file = Path(__file__).parent / "certs" / "cert.pem"
    key_file = Path(__file__).parent / "certs" / "key.pem"

    print(f"GreenTrack server running on http://localhost:{port}")
    print(f"Health check: http://localhost:{port}/health")
    print(f"AI key configured: {'Yes' if os.getenv('GROQ_API_KEY') else 'No (fallback mode)'}")

    ssl_kwargs = {}
    if cert_file.exists() and key_file.exists():
        ssl_kwargs = {"ssl_certfile": str(cert_file), "ssl_keyfile": str(key_file)}

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        **ssl_kwargs,
    )
