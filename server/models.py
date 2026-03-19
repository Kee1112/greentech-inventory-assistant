from pydantic import BaseModel
from typing import Optional, List, Literal


class InventoryItem(BaseModel):
    id: int
    name: str
    category: str
    quantity: float
    unit: str
    reorderThreshold: float
    expiryDate: Optional[str] = None
    lastRestocked: str
    dailyUsageRate: float
    supplier: str
    sustainabilityScore: int
    notes: str
    createdAt: str
    updatedAt: str


class InventoryItemCreate(BaseModel):
    name: str
    category: str
    quantity: float
    unit: str
    reorderThreshold: float
    expiryDate: Optional[str] = None
    lastRestocked: str
    dailyUsageRate: float
    supplier: str
    sustainabilityScore: int
    notes: str = ""


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    reorderThreshold: Optional[float] = None
    expiryDate: Optional[str] = None
    lastRestocked: Optional[str] = None
    dailyUsageRate: Optional[float] = None
    supplier: Optional[str] = None
    sustainabilityScore: Optional[int] = None
    notes: Optional[str] = None


class InsightResult(BaseModel):
    daysUntilEmpty: float
    needsReorder: bool
    urgency: Literal["critical", "warning", "ok"]
    reorderMessage: str
    sustainabilityTip: str
    alternativeSuppliers: Optional[List[str]] = None
    source: Literal["ai", "fallback"]


class BulkInsightResult(BaseModel):
    item: InventoryItem
    insight: InsightResult


class CategorizeRequest(BaseModel):
    name: str
    notes: Optional[str] = ""
