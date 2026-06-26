import OpenAI from "openai";
import { CONFIG } from "./config";

export interface ParsedIntent {
  dimensions: { dimension: string; weight: number }[];
  excluded: string[];
  source: "deterministic" | "llm";
}

const KNOWN_DIMENSIONS = [
  "authenticity", "food_quality", "ambiance", "presentation",
  "noise_level", "price_value", "wait_time", "service",
  "kid_friendliness", "drink_quality", "portion_size",
  "cleanliness", "parking", "menu_variety", "location",
] as const;

const DIMENSION_KEYWORDS: Record<string, string[]> = {
  authenticity: [
    "authentic", "traditional", "real", "genuine", "original",
    "legit", "proper", "true", "classic", "old-school",
    "not dumbed down", "not westernized", "not fusion",
  ],
  food_quality: [
    "delicious", "flavor", "taste", "tasty", "fresh",
    "quality ingredients", "well-cooked", "seasoning",
  ],
  ambiance: [
    "ambiance", "atmosphere", "vibe", "vibes", "decor",
    "gorgeous", "beautiful", "romantic", "cozy", "trendy",
    "instagram", "instagrammable", "instagram-worthy", "photo",
  ],
  presentation: [
    "presentation", "plating", "beautiful food", "gorgeous food",
    "instagram-worthy", "instagrammable",
  ],
  noise_level: [
    "quiet", "peaceful", "not loud", "not too loud", "noise",
    "calm", "serene", "intimate",
  ],
  price_value: [
    "cheap", "value", "affordable", "price", "budget",
    "inexpensive", "reasonable", "bang for buck", "worth",
    "under $", "money",
  ],
  wait_time: [
    "quick", "fast", "speed", "no wait", "short wait",
    "efficient", "prompt",
  ],
  service: [
    "service", "staff", "attentive", "friendly staff",
    "hospitality", "waiter", "server",
  ],
  kid_friendliness: [
    "kids", "family", "children", "kid-friendly", "family-friendly",
    "highchair", "kids menu",
  ],
  drink_quality: [
    "cocktails", "cocktail", "drinks", "wine", "wine list",
    "bar", "beer", "sake", "chai", "coffee",
  ],
  portion_size: [
    "portion", "generous", "big portions", "large",
    "filling", "hearty",
  ],
  cleanliness: [
    "clean", "hygiene", "sanitary", "tidy",
  ],
  parking: [
    "parking", "easy access", "accessible",
  ],
  menu_variety: [
    "menu", "variety", "options", "selection", "diverse menu",
  ],
  location: [
    "location", "convenient", "close to", "walkable",
  ],
};

const SPICE_KEYWORDS = ["spice", "spicy", "heat", "hot", "chili", "chilli"];

const NEGATION_PATTERNS = [
  /don'?t\s+care\s+about\s+(.+?)(?:\.|,|$)/gi,
  /not\s+interested\s+in\s+(.+?)(?:\.|,|$)/gi,
  /ignore\s+(.+?)(?:\.|,|$)/gi,
  /doesn'?t?\s+matter\s+(?:about\s+)?(.+?)(?:\.|,|$)/gi,
  /not\s+important\s*[:\-]?\s*(.+?)(?:\.|,|$)/gi,
];

function findDimensionForKeyword(keyword: string): string | null {
  const lower = keyword.toLowerCase().trim();
  for (const [dimension, keywords] of Object.entries(DIMENSION_KEYWORDS)) {
    if (keywords.some((kw) => {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      return regex.test(lower);
    })) {
      return dimension;
    }
  }
  return null;
}

export function parseIntent(intent: string): Omit<ParsedIntent, "source"> {
  const lower = intent.toLowerCase();
  const excluded: string[] = [];
  const matched = new Map<string, number>();

  for (const pattern of NEGATION_PATTERNS) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(lower)) !== null) {
      const negatedText = match[1].trim();
      const dim = findDimensionForKeyword(negatedText);
      if (dim) excluded.push(dim);
    }
  }

  const hasSpice = SPICE_KEYWORDS.some((kw) => lower.includes(kw));
  if (hasSpice) {
    const pos = Math.min(
      ...SPICE_KEYWORDS.map((kw) => {
        const idx = lower.indexOf(kw);
        return idx >= 0 ? idx : Infinity;
      })
    );
    if (!excluded.includes("authenticity")) {
      matched.set("authenticity", (matched.get("authenticity") ?? 0) + (1000 - pos));
    }
  }

  for (const [dimension, keywords] of Object.entries(DIMENSION_KEYWORDS)) {
    if (excluded.includes(dimension)) continue;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      const match = regex.exec(lower);
      if (match) {
        const idx = match.index;
        const positionWeight = 1000 - idx;
        matched.set(
          dimension,
          Math.max(matched.get(dimension) ?? 0, positionWeight)
        );
      }
    }
  }

  if (matched.size === 0) {
    return { dimensions: [], excluded };
  }

  const sorted = Array.from(matched.entries()).sort((a, b) => b[1] - a[1]);

  const rawWeights = sorted.map((_, i) => Math.pow(CONFIG.intent.weightDecayBase, i));
  const totalWeight = rawWeights.reduce((a, b) => a + b, 0);

  const dimensions = sorted.map(([dimension], i) => ({
    dimension,
    weight: Math.round((rawWeights[i] / totalWeight) * 100) / 100,
  }));

  return { dimensions, excluded };
}

interface ProviderConfig {
  name: string;
  apiKey: string | undefined;
  baseURL: string;
  model: string;
}

function getProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];
  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: "groq",
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
      model: "llama-3.3-70b-versatile",
    });
  }
  if (process.env.TOGETHER_API_KEY) {
    providers.push({
      name: "together",
      apiKey: process.env.TOGETHER_API_KEY,
      baseURL: "https://api.together.xyz/v1",
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    });
  }
  return providers;
}

const _clients = new Map<string, OpenAI>();
function getClient(provider: ProviderConfig): OpenAI {
  if (!_clients.has(provider.name)) {
    _clients.set(provider.name, new OpenAI({ apiKey: provider.apiKey, baseURL: provider.baseURL }));
  }
  return _clients.get(provider.name)!;
}

async function parseIntentWithLLM(
  intent: string,
  excluded: string[]
): Promise<{ dimension: string; weight: number }[]> {
  const providers = getProviders();
  if (providers.length === 0) return [];

  const provider = providers[0];
  const client = getClient(provider);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.llm.timeoutMs);

  try {
    const response = await client.chat.completions.create(
      {
        model: provider.model,
        temperature: 0.1,
        max_tokens: 512,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You extract restaurant evaluation dimensions from natural language. Respond with ONLY valid JSON.",
          },
          {
            role: "user",
            content: `Given a user's intent for visiting a restaurant, identify which dimensions matter most to them and assign weights (0.0 to 1.0, must sum to 1.0).

User intent: "${intent}"

Available dimensions: ${KNOWN_DIMENSIONS.join(", ")}
${excluded.length > 0 ? `Excluded (user explicitly doesn't care): ${excluded.join(", ")}` : ""}

Rules:
- Pick 2-5 dimensions that best match the user's intent
- Assign higher weights to more important dimensions
- Weights must sum to 1.0
- Use ONLY dimensions from the list above
- Do NOT include excluded dimensions

Respond as JSON:
{
  "dimensions": [
    { "dimension": "noise_level", "weight": 0.45 },
    { "dimension": "ambiance", "weight": 0.35 },
    { "dimension": "service", "weight": 0.20 }
  ]
}`,
          },
        ],
      },
      { signal: controller.signal }
    );

    const text = response.choices[0].message.content ?? "";
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = match ? match[1].trim() : text.trim();

    const parsed = JSON.parse(raw) as {
      dimensions: { dimension: string; weight: number }[];
    };

    const validDimensions = parsed.dimensions.filter(
      (d) =>
        KNOWN_DIMENSIONS.includes(d.dimension as (typeof KNOWN_DIMENSIONS)[number]) &&
        !excluded.includes(d.dimension) &&
        d.weight > 0
    );

    if (validDimensions.length === 0) return [];

    const totalWeight = validDimensions.reduce((sum, d) => sum + d.weight, 0);
    return validDimensions.map((d) => ({
      dimension: d.dimension,
      weight: Math.round((d.weight / totalWeight) * 100) / 100,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function parseIntentSmart(intent: string): Promise<ParsedIntent> {
  const deterministic = parseIntent(intent);

  if (deterministic.dimensions.length > 0) {
    return { ...deterministic, source: "deterministic" };
  }

  const llmDimensions = await parseIntentWithLLM(intent, deterministic.excluded);

  if (llmDimensions.length > 0) {
    return {
      dimensions: llmDimensions,
      excluded: deterministic.excluded,
      source: "llm",
    };
  }

  return {
    dimensions: [{ dimension: "food_quality", weight: 1.0 }],
    excluded: deterministic.excluded,
    source: "deterministic",
  };
}
