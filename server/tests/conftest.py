import pytest


@pytest.fixture(autouse=True, scope="module")
def reset_rate_limiter():
    """Reset slowapi's in-memory rate limit counters before each test module."""
    from limiter import limiter
    try:
        limiter._limiter._storage.reset()
    except Exception:
        pass
    yield
    try:
        limiter._limiter._storage.reset()
    except Exception:
        pass