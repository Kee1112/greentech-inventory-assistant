import Anthropic from '@anthropic-ai/sdk';
import { InventoryItem } from '../db';
import { InsightResult, generateFallbackInsights } from './fallbackService';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateAIInsights(
  item: InventoryItem,
  allItems: InventoryItem[]
): Promise<InsightResult> {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    return generateFallbackInsights(item);
  }

  try {
    const daysUntilEmpty = item.dailyUsageRate > 0
      ? Math.floor(item.quantity / item.dailyUsageRate)
      : 9999;

    let daysUntilExpiry: number | null = null;
    if (item.expiryDate) {
      const expiry = new Date(item.expiryDate);
      const now = new Date();
      daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    const categoryItems = allItems.filter(i => i.category === item.category && i.id !== item.id);
    const categoryContext = categoryItems.length > 0
      ? `Other ${item.category} items in inventory: ${categoryItems.map(i => i.name).join(', ')}.`
      : '';

    const prompt = `You are an AI inventory assistant for a green-tech focused organization (a small cafe/university lab). Analyze this inventory item and provide actionable insights focused on sustainability and efficiency.

Item Details:
- Name: ${item.name}
- Category: ${item.category}
- Current Quantity: ${item.quantity} ${item.unit}
- Reorder Threshold: ${item.reorderThreshold} ${item.unit}
- Daily Usage Rate: ${item.dailyUsageRate} ${item.unit}/day
- Days Until Empty (estimated): ${daysUntilEmpty} days
- Expiry Date: ${item.expiryDate ? item.expiryDate : 'N/A'}
${daysUntilExpiry !== null ? `- Days Until Expiry: ${daysUntilExpiry} days` : ''}
- Last Restocked: ${item.lastRestocked}
- Current Supplier: ${item.supplier}
- Sustainability Score: ${item.sustainabilityScore}/10
- Notes: ${item.notes}
${categoryContext}

Please respond with ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{
  "daysUntilEmpty": <number>,
  "needsReorder": <boolean>,
  "urgency": <"critical" | "warning" | "ok">,
  "reorderMessage": "<actionable reorder recommendation string>",
  "sustainabilityTip": "<specific eco-friendly tip or improvement suggestion>",
  "alternativeSuppliers": ["<supplier name 1>", "<supplier name 2>", "<supplier name 3>"]
}

Rules:
- urgency is "critical" if stock will run out in <= 2 days OR quantity is 0 OR expiry is within 2 days
- urgency is "warning" if quantity <= reorderThreshold OR daysUntilEmpty < 7 OR expiry within 7 days
- urgency is "ok" otherwise
- needsReorder is true if urgency is "critical" or "warning"
- reorderMessage should be specific and actionable, mentioning the supplier and quantity to order
- sustainabilityTip should be specific to this item's sustainability score and category
- alternativeSuppliers should be 2-3 realistic eco-friendly supplier names relevant to this item's category and location (Palo Alto/Bay Area context)`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return generateFallbackInsights(item);
    }

    const responseText = content.text.trim();
    // Strip potential markdown code fences
    const jsonText = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(jsonText) as Omit<InsightResult, 'source'>;

    // Validate required fields
    if (
      typeof parsed.daysUntilEmpty !== 'number' ||
      typeof parsed.needsReorder !== 'boolean' ||
      !['critical', 'warning', 'ok'].includes(parsed.urgency) ||
      typeof parsed.reorderMessage !== 'string' ||
      typeof parsed.sustainabilityTip !== 'string'
    ) {
      return generateFallbackInsights(item);
    }

    return {
      ...parsed,
      alternativeSuppliers: Array.isArray(parsed.alternativeSuppliers)
        ? parsed.alternativeSuppliers
        : [],
      source: 'ai',
    };
  } catch (error) {
    console.error('AI insights error, falling back to rule-based:', error instanceof Error ? error.message : error);
    return generateFallbackInsights(item);
  }
}

export async function categorizeItemWithAI(name: string, notes: string): Promise<string> {
  const validCategories = ['Office Supplies', 'Perishable Food', 'Cleaning Supplies', 'Lab Equipment', 'Electronics'];

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    return 'Office Supplies';
  }

  try {
    const prompt = `You are a categorization assistant. Given an inventory item name and notes, assign it to exactly one of these categories: ${validCategories.join(', ')}.

Item Name: ${name}
Notes: ${notes}

Respond with ONLY the category name, nothing else. Choose the single best matching category from the list.`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return 'Office Supplies';
    }

    const suggested = content.text.trim();
    return validCategories.includes(suggested) ? suggested : 'Office Supplies';
  } catch (error) {
    console.error('AI categorization error, using fallback:', error instanceof Error ? error.message : error);
    return 'Office Supplies';
  }
}
