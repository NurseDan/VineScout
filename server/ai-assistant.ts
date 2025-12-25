import OpenAI from "openai";
import type { VineItem, StorageUnit } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function analyzeInventory(items: VineItem[]): Promise<{
  totalItems: number;
  insights: string[];
  recommendations: string[];
  statusBreakdown: Record<string, number>;
}> {
  const statusBreakdown: Record<string, number> = {};
  items.forEach((item) => {
    statusBreakdown[item.status] = (statusBreakdown[item.status] || 0) + 1;
  });

  const pendingReviews = items.filter(
    (i) => i.status === "received" || i.status === "reviewing"
  );
  const overdueReviews = pendingReviews.filter(
    (i) => i.reviewDueDate && new Date(i.reviewDueDate) < new Date()
  );
  const sellableItems = items.filter((i) => i.status === "sellable");

  const prompt = `Analyze this Amazon Vine inventory and provide actionable insights:

Total Items: ${items.length}
Status Breakdown: ${JSON.stringify(statusBreakdown)}
Pending Reviews: ${pendingReviews.length}
Overdue Reviews: ${overdueReviews.length}
Sellable Items: ${sellableItems.length}
Total Estimated Value: $${items.reduce((sum, i) => sum + (i.taxValue || 0), 0).toFixed(2)}

Top items by value:
${items
  .sort((a, b) => (b.taxValue || 0) - (a.taxValue || 0))
  .slice(0, 5)
  .map((i) => `- ${i.description.slice(0, 50)}... ($${i.taxValue})`)
  .join("\n")}

Provide 3-5 specific insights and 3-5 actionable recommendations in JSON format:
{
  "insights": ["insight1", "insight2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);

  return {
    totalItems: items.length,
    insights: parsed.insights || [],
    recommendations: parsed.recommendations || [],
    statusBreakdown,
  };
}

export async function suggestOptimalStorage(
  item: VineItem,
  storageUnits: StorageUnit[]
): Promise<{
  suggestedUnit: string | null;
  reasoning: string;
  alternativeLocations: string[];
}> {
  if (storageUnits.length === 0) {
    return {
      suggestedUnit: null,
      reasoning: "No storage units are configured. Please add storage units first.",
      alternativeLocations: [],
    };
  }

  const prompt = `Suggest the best storage location for this Amazon Vine item:

Item: ${item.description}
ASIN: ${item.asin}
Estimated Value: $${item.taxValue || 0}
Status: ${item.status}
Current Location: ${item.storageLocation || "Not assigned"}

Available Storage Units:
${storageUnits
  .map(
    (u) =>
      `- ${u.name}: ${u.width}x${u.height}x${u.depth} inches, ${u.shelves} shelves, ${((u.usedCapacity || 0) * 100).toFixed(0)}% used`
  )
  .join("\n")}

Provide a recommendation in JSON format:
{
  "suggestedUnit": "unit name or null if none suitable",
  "reasoning": "explanation of why this unit is best",
  "alternativeLocations": ["backup option 1", "backup option 2"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);

  return {
    suggestedUnit: parsed.suggestedUnit || null,
    reasoning: parsed.reasoning || "Unable to determine optimal storage.",
    alternativeLocations: parsed.alternativeLocations || [],
  };
}

export async function generateReviewReminder(item: VineItem): Promise<{
  subject: string;
  body: string;
  keyPoints: string[];
}> {
  const daysUntilDue = item.reviewDueDate
    ? Math.ceil(
        (new Date(item.reviewDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const prompt = `Generate a helpful review reminder for this Amazon Vine item:

Item: ${item.description}
ASIN: ${item.asin}
Order Date: ${item.orderDate ? new Date(item.orderDate).toLocaleDateString() : "Unknown"}
Received Date: ${item.receivedDate ? new Date(item.receivedDate).toLocaleDateString() : "Not received"}
Review Due: ${item.reviewDueDate ? new Date(item.reviewDueDate).toLocaleDateString() : "No deadline set"}
Days Until Due: ${daysUntilDue !== null ? daysUntilDue : "N/A"}

Generate a reminder with key points to include in the review. Output in JSON format:
{
  "subject": "reminder email subject line",
  "body": "friendly reminder message",
  "keyPoints": ["point to cover in review 1", "point 2", "point 3"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);

  return {
    subject: parsed.subject || `Review Reminder: ${item.description.slice(0, 30)}...`,
    body: parsed.body || "Don't forget to review this item!",
    keyPoints: parsed.keyPoints || [],
  };
}

export async function predictSellPrice(item: VineItem): Promise<{
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  reasoning: string;
  tips: string[];
}> {
  const prompt = `Suggest a selling price for this Amazon Vine item that is now eligible for sale:

Item: ${item.description}
ASIN: ${item.asin}
Original Tax Value (ETV): $${item.taxValue || 0}
Order Date: ${item.orderDate ? new Date(item.orderDate).toLocaleDateString() : "Unknown"}
Sellable Date: ${item.sellableDate ? new Date(item.sellableDate).toLocaleDateString() : "Now"}

Consider that:
- The item was received for free through Amazon Vine
- It may have been used for testing/review
- Condition should be disclosed to buyers
- The ETV (Estimated Tax Value) represents the original retail value

Provide pricing recommendation in JSON format:
{
  "suggestedPrice": 25.00,
  "priceRange": { "min": 20.00, "max": 35.00 },
  "reasoning": "explanation of pricing strategy",
  "tips": ["selling tip 1", "selling tip 2"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);

  const taxValue = item.taxValue || 0;
  return {
    suggestedPrice: parsed.suggestedPrice || taxValue * 0.5,
    priceRange: parsed.priceRange || { min: taxValue * 0.3, max: taxValue * 0.7 },
    reasoning: parsed.reasoning || "Price based on typical resale value for Vine items.",
    tips: parsed.tips || [],
  };
}
