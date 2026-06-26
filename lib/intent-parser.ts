import { CONFIG } from "./config";

export interface ParsedIntent {
  dimensions: { dimension: string; weight: number }[];
  excluded: string[];
}

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

export function parseIntent(intent: string): ParsedIntent {
  const lower = intent.toLowerCase();
  const excluded: string[] = [];
  const matched = new Map<string, number>();

  // Detect negations first
  for (const pattern of NEGATION_PATTERNS) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(lower)) !== null) {
      const negatedText = match[1].trim();
      const dim = findDimensionForKeyword(negatedText);
      if (dim) excluded.push(dim);
    }
  }

  // Detect spice keywords → map to authenticity (primary) + food_quality (secondary)
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

  // Match dimensions by keyword position in intent string (word boundary matching)
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

  // If nothing matched, return empty (caller will fall back to LLM)
  if (matched.size === 0) {
    return { dimensions: [], excluded };
  }

  // Sort by position weight (earlier in intent = higher priority)
  const sorted = Array.from(matched.entries()).sort((a, b) => b[1] - a[1]);

  // Assign weights: exponential decay based on rank
  const rawWeights = sorted.map((_, i) => Math.pow(CONFIG.intent.weightDecayBase, i));
  const totalWeight = rawWeights.reduce((a, b) => a + b, 0);

  const dimensions = sorted.map(([dimension], i) => ({
    dimension,
    weight: Math.round((rawWeights[i] / totalWeight) * 100) / 100,
  }));

  return { dimensions, excluded };
}
