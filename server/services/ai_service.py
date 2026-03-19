import os
import json
import re
from datetime import datetime, timezone
from typing import Dict, Any, List

from services.fallback_service import generate_fallback_insights

CATEGORIES = [
    "Office Supplies",
    "Perishable Food",
    "Cleaning Supplies",
    "Lab Equipment",
    "Electronics",
]


def _days_until_expiry(expiry_date: str) -> float:
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


def _get_client():
    from groq import Groq
    return Groq(api_key=os.getenv("GROQ_API_KEY", ""))


def generate_ai_insights(item: Dict[str, Any]) -> Dict[str, Any]:
    api_key = os.getenv("GROQ_API_KEY", "")
    print(f"[AI] GROQ_API_KEY present: {bool(api_key)}, value starts: {api_key[:8] if api_key else 'NONE'}")
    if not api_key:
        return generate_fallback_insights(item)

    try:
        client = _get_client()

        daily_rate = item.get("dailyUsageRate", 0)
        quantity = item.get("quantity", 0)
        days_until_empty = quantity / daily_rate if daily_rate > 0 else float("inf")
        days_until_expiry = _days_until_expiry(item.get("expiryDate", ""))

        expiry_lines = ""
        if item.get("expiryDate"):
            expiry_lines = f"Expiry Date: {item['expiryDate']}\nDays Until Expiry: {round(days_until_expiry)}"

        prompt = f"""You are a sustainability-focused inventory assistant for a small organization.

Analyze this inventory item and assess its urgency intelligently — not just by thresholds, but by considering the full context:
- How critical is this item to daily operations given its category?
- How hard is it to replace quickly (consider the supplier and category)?
- Does the expiry date change how urgently action is needed?
- Do the notes mention anything that affects urgency (e.g. "last unit", "long lead time", "seasonal")?
- Is the sustainability score so low that sourcing a better alternative should be urgent?

Item: {item['name']}
Category: {item['category']}
Current Quantity: {quantity} {item['unit']}
Reorder Threshold: {item['reorderThreshold']} {item['unit']}
Daily Usage Rate: {daily_rate} {item['unit']}/day
Days Until Empty: {days_until_empty:.1f} days
{expiry_lines}
Supplier: {item.get('supplier', 'Unknown')}
Sustainability Score: {item.get('sustainabilityScore', 5)}/10
Notes: {item.get('notes', '')}

Respond with ONLY a valid JSON object (no markdown, no explanation):
{{
  "daysUntilEmpty": <number>,
  "needsReorder": <boolean>,
  "urgency": "<critical|warning|ok>",
  "urgencyReason": "<1 sentence explaining why you chose this urgency level>",
  "reorderMessage": "<concise actionable message, 1-2 sentences>",
  "sustainabilityTip": "<specific eco-friendly tip for this item, 1-2 sentences>",
  "alternativeSuppliers": ["<supplier 1>", "<supplier 2>", "<supplier 3>"],
  "dailyProjection": [<14 numbers: projected remaining quantity at end of each of the next 14 days, never below 0, adjusted for any usage pattern you infer from the category/notes>]
}}"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        text = response.choices[0].message.content.strip()

        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            text = match.group()

        result = json.loads(text)

        required = ["daysUntilEmpty", "needsReorder", "urgency", "reorderMessage", "sustainabilityTip"]
        if not all(k in result for k in required):
            return generate_fallback_insights(item)

        result["source"] = "ai"
        return result

    except Exception as e:
        print(f"[AI] Groq error: {e}")
        return generate_fallback_insights(item)


def categorize_item_with_ai(name: str, notes: str = "") -> str:
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        return _fallback_categorize(name)

    try:
        client = _get_client()
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content":
                f"Categorize this inventory item into exactly one of these categories:\n"
                f"Office Supplies, Perishable Food, Cleaning Supplies, Lab Equipment, Electronics\n\n"
                f"Item name: {name}\nNotes: {notes}\n\n"
                f"Reply with ONLY the category name, nothing else."
            }],
            temperature=0,
        )
        category = response.choices[0].message.content.strip()
        return category if category in CATEGORIES else _fallback_categorize(name)

    except Exception:
        return _fallback_categorize(name)


def _fallback_categorize(name: str) -> str:
    n = name.lower()
    if any(w in n for w in ["food", "milk", "bread", "coffee", "organic", "fruit", "vegetable", "almond", "sourdough"]):
        return "Perishable Food"
    if any(w in n for w in ["clean", "soap", "detergent", "sanitizer", "wipe", "mop", "bin liner", "compostable"]):
        return "Cleaning Supplies"
    if any(w in n for w in ["lab", "pipette", "chemical", "beaker", "flask", "meter", "strip", "ph"]):
        return "Lab Equipment"
    if any(w in n for w in ["computer", "laptop", "usb", "charger", "cable", "electronic", "calculator", "battery"]):
        return "Electronics"
    return "Office Supplies"


def generate_portfolio_summary(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        return _fallback_portfolio_summary(items)

    try:
        client = _get_client()

        item_lines = []
        for item in items:
            daily = item.get("dailyUsageRate", 0)
            qty = item.get("quantity", 0)
            days_left = round(qty / daily, 1) if daily > 0 else 999
            low = qty <= item.get("reorderThreshold", 0)
            item_lines.append(
                f"- {item['name']} | category: {item['category']} | qty: {qty} {item['unit']} "
                f"| days left: {days_left} | low stock: {low} | supplier: {item.get('supplier', '?')} "
                f"| eco score: {item.get('sustainabilityScore', 5)}/10 | notes: {item.get('notes', '')}"
            )

        prompt = f"""You are a sustainability-focused inventory analyst. Analyze this full inventory and identify cross-item opportunities a rule engine could never detect.

Inventory ({len(items)} items):
{chr(10).join(item_lines)}

Respond with ONLY a valid JSON object (no markdown, no explanation):
{{
  "headline": "<1 sentence overall status of the inventory>",
  "orderGroups": [
    {{
      "supplier": "<supplier name>",
      "items": ["<item name>", ...],
      "saving": "<why consolidating this order saves emissions or cost>"
    }}
  ],
  "riskItems": [
    {{
      "name": "<item name>",
      "risk": "<specific risk that pure threshold logic would miss — e.g. lead time, seasonal demand, expiry timing>"
    }}
  ],
  "sustainabilityWins": [
    "<one concrete cross-item action to improve overall sustainability score>"
  ],
  "unusualPatterns": "<any anomaly across items worth flagging, or null if none>"
}}

Rules:
- orderGroups: only suggest consolidation where it genuinely makes sense (same or nearby supplier, same ordering cycle)
- riskItems: focus on items where context (notes, category, supplier) reveals hidden risk beyond just low qty
- sustainabilityWins: max 3 items, be specific not generic
- unusualPatterns: look for things like two perishables expiring same week, or all lab items low simultaneously"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
        )
        text = response.choices[0].message.content.strip()
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            text = match.group()

        result = json.loads(text)
        result["source"] = "ai"
        return result

    except Exception as e:
        print(f"[AI] Portfolio summary error: {e}")
        return _fallback_portfolio_summary(items)


def _fallback_portfolio_summary(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    low_stock = [i for i in items if i.get("quantity", 0) <= i.get("reorderThreshold", 0)]
    return {
        "headline": f"{len(low_stock)} of {len(items)} items are at or below reorder threshold.",
        "orderGroups": [],
        "riskItems": [{"name": i["name"], "risk": "At or below reorder threshold"} for i in low_stock],
        "sustainabilityWins": ["Review suppliers for eco-certified alternatives"],
        "unusualPatterns": None,
        "source": "fallback",
    }