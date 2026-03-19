from datetime import datetime, timezone
from typing import Dict, Any, Optional


def _days_until_expiry(expiry_date: Optional[str]) -> float:
    if not expiry_date:
        return float("inf")
    try:
        expiry = datetime.fromisoformat(expiry_date.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        return (expiry - now).days
    except Exception:
        return float("inf")


def generate_fallback_insights(item: Dict[str, Any]) -> Dict[str, Any]:
    quantity = item.get("quantity", 0)
    daily_rate = item.get("dailyUsageRate", 0)
    reorder_threshold = item.get("reorderThreshold", 0)
    expiry_date = item.get("expiryDate")
    sustainability_score = item.get("sustainabilityScore", 5)
    name = item.get("name", "item")
    unit = item.get("unit", "units")

    days_until_empty = quantity / daily_rate if daily_rate > 0 else float("inf")
    days_until_expiry = _days_until_expiry(expiry_date)

    needs_reorder = quantity <= reorder_threshold or days_until_empty <= 7

    if quantity <= reorder_threshold or days_until_empty <= 3 or days_until_expiry <= 2:
        urgency = "critical"
    elif days_until_empty <= 7 or days_until_expiry <= 7:
        urgency = "warning"
    else:
        urgency = "ok"

    if urgency == "critical":
        if days_until_expiry <= 2:
            reorder_message = f"CRITICAL: {name} expires very soon! Use or donate immediately to avoid waste."
        else:
            reorder_message = (
                f"CRITICAL: {name} is at or below reorder threshold "
                f"({reorder_threshold} {unit}). Reorder immediately."
            )
    elif urgency == "warning":
        days_str = f"{days_until_empty:.0f}" if days_until_empty != float("inf") else "unknown"
        reorder_message = f"Warning: {name} will run out in approximately {days_str} days. Consider reordering soon."
    else:
        days_str = f"{days_until_empty:.0f}" if days_until_empty != float("inf") else "plenty of"
        reorder_message = f"{name} is well-stocked. Estimated {days_str} days of supply remaining."

    if sustainability_score >= 9:
        tip = f"{name} already has an excellent sustainability score! Share your sourcing strategy with others."
    elif sustainability_score >= 7:
        tip = f"Good sustainability score for {name}. Consider switching to bulk purchasing to reduce packaging waste."
    elif sustainability_score >= 5:
        tip = f"Consider sourcing {name} from certified eco-friendly suppliers to improve your sustainability score."
    elif sustainability_score >= 3:
        tip = f"{name} has a low sustainability score. Look for recycled, refurbished, or locally-sourced alternatives."
    else:
        tip = (
            f"Priority improvement needed: {name} scores very low on sustainability. "
            "Research eco-certified alternatives immediately."
        )

    days_value = days_until_empty if days_until_empty != float("inf") else 9999

    return {
        "daysUntilEmpty": round(days_value, 1),
        "needsReorder": needs_reorder,
        "urgency": urgency,
        "reorderMessage": reorder_message,
        "sustainabilityTip": tip,
        "alternativeSuppliers": None,
        "source": "fallback",
    }
