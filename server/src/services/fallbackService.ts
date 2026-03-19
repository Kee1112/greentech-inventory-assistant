import { InventoryItem } from '../db';

export interface InsightResult {
  daysUntilEmpty: number;
  needsReorder: boolean;
  urgency: 'critical' | 'warning' | 'ok';
  reorderMessage: string;
  sustainabilityTip: string;
  alternativeSuppliers?: string[];
  source: 'ai' | 'fallback';
}

export function generateFallbackInsights(item: InventoryItem): InsightResult {
  const daysUntilEmpty = item.dailyUsageRate > 0
    ? Math.floor(item.quantity / item.dailyUsageRate)
    : 9999;

  let daysUntilExpiry: number | null = null;
  if (item.expiryDate) {
    const expiry = new Date(item.expiryDate);
    const now = new Date();
    daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  const needsReorder = item.quantity <= item.reorderThreshold || daysUntilEmpty < 7;

  let urgency: 'critical' | 'warning' | 'ok';
  if (
    item.quantity <= 0 ||
    daysUntilEmpty <= 2 ||
    (daysUntilExpiry !== null && daysUntilExpiry <= 2)
  ) {
    urgency = 'critical';
  } else if (
    needsReorder ||
    daysUntilEmpty < 7 ||
    (daysUntilExpiry !== null && daysUntilExpiry <= 7)
  ) {
    urgency = 'warning';
  } else {
    urgency = 'ok';
  }

  let reorderMessage: string;
  if (urgency === 'critical') {
    if (item.quantity <= 0) {
      reorderMessage = `CRITICAL: ${item.name} is completely out of stock. Place an emergency order with ${item.supplier} immediately.`;
    } else if (daysUntilExpiry !== null && daysUntilExpiry <= 2) {
      reorderMessage = `CRITICAL: ${item.name} expires in ${daysUntilExpiry} day(s). Use or discard immediately and reorder from ${item.supplier}.`;
    } else {
      reorderMessage = `CRITICAL: ${item.name} will run out in approximately ${daysUntilEmpty} day(s). Order now from ${item.supplier}.`;
    }
  } else if (urgency === 'warning') {
    if (item.quantity <= item.reorderThreshold) {
      reorderMessage = `WARNING: ${item.name} is at or below reorder threshold (${item.quantity} ${item.unit} remaining, threshold: ${item.reorderThreshold}). Consider ordering from ${item.supplier}.`;
    } else if (daysUntilExpiry !== null && daysUntilExpiry <= 7) {
      reorderMessage = `WARNING: ${item.name} expires in ${daysUntilExpiry} day(s). Plan reorder from ${item.supplier} soon.`;
    } else {
      reorderMessage = `WARNING: ${item.name} will run out in approximately ${daysUntilEmpty} day(s). Plan a reorder from ${item.supplier}.`;
    }
  } else {
    reorderMessage = `${item.name} stock is adequate. Next reorder needed in approximately ${daysUntilEmpty} day(s). Current supplier: ${item.supplier}.`;
  }

  let sustainabilityTip: string;
  if (item.sustainabilityScore >= 9) {
    sustainabilityTip = `Excellent sustainability score (${item.sustainabilityScore}/10)! This item is a model eco-friendly choice. Share sourcing details with the team to encourage similar procurement decisions.`;
  } else if (item.sustainabilityScore >= 7) {
    sustainabilityTip = `Good sustainability score (${item.sustainabilityScore}/10). Consider asking ${item.supplier} about bulk purchasing discounts to reduce delivery emissions further.`;
  } else if (item.sustainabilityScore >= 5) {
    sustainabilityTip = `Moderate sustainability score (${item.sustainabilityScore}/10). Research eco-certified alternatives. Look for suppliers offering products with recyclable packaging or organic certifications.`;
  } else if (item.sustainabilityScore >= 3) {
    sustainabilityTip = `Low sustainability score (${item.sustainabilityScore}/10). Prioritize finding a greener supplier for ${item.name}. Check eco-procurement databases for certified alternatives.`;
  } else {
    sustainabilityTip = `Very low sustainability score (${item.sustainabilityScore}/10). This item should be replaced with an eco-friendly alternative as soon as possible. Consult your sustainability team for approved substitutes.`;
  }

  return {
    daysUntilEmpty,
    needsReorder,
    urgency,
    reorderMessage,
    sustainabilityTip,
    source: 'fallback',
  };
}
