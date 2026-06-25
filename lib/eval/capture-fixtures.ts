import { writeFileSync } from "fs";
import { join } from "path";
import { searchPlace } from "../google-places";
import { EvalCase } from "./types";

interface CaptureSpec {
  query: string;
  city: string;
  intents: {
    id: string;
    intent: string;
    pairedWith?: string;
    expectations: EvalCase["expectations"];
    humanScore?: number;
    humanRationale?: string;
  }[];
}

const SPECS: CaptureSpec[] = [
  // --- Cuisine diversity (same intent, different cuisines) ---
  {
    query: "Alo Restaurant, Toronto",
    city: "Toronto",
    intents: [
      {
        id: "alo-authentic-french",
        intent:
          "Authentic French fine dining, classical technique, not fusion or modernist, proper wine pairings",
        expectations: {
          dimensionsMustInclude: ["food_quality", "authenticity"],
          explanationMustMention: ["french"],
          weightOrder: ["authenticity", "food_quality", "ambiance"],
        },
        humanScore: 4.2,
        humanRationale:
          "Alo is genuinely French-technique focused. Reviews should reflect high authenticity.",
      },
      {
        id: "alo-celebration",
        intent:
          "Special occasion celebration, impressive atmosphere, money is no object, Instagram-worthy",
        pairedWith: "alo-authentic-french",
        expectations: {
          scoreShouldBe: { min: 4.0, max: 5.0 },
          dimensionsMustInclude: ["ambiance", "presentation"],
          weightOrder: ["ambiance", "presentation", "food_quality"],
        },
        humanScore: 4.8,
        humanRationale:
          "Alo is consistently praised for its atmosphere and presentation. Perfect celebration spot.",
      },
    ],
  },
  {
    query: "Suresh Doss recommended Ethiopian restaurant Toronto",
    city: "Toronto",
    intents: [
      {
        id: "ethiopian-authentic",
        intent:
          "Authentic Ethiopian food, traditional injera, real spice blends, communal eating, not westernized",
        expectations: {
          dimensionsMustInclude: ["food_quality", "authenticity"],
          weightOrder: ["authenticity", "food_quality"],
        },
      },
    ],
  },
  {
    query: "Raku Japanese restaurant, Toronto",
    city: "Toronto",
    intents: [
      {
        id: "raku-omakase",
        intent:
          "Traditional Japanese omakase, fresh fish quality, authentic preparation, minimalist presentation",
        expectations: {
          dimensionsMustInclude: ["food_quality", "authenticity"],
          weightOrder: ["authenticity", "food_quality", "ambiance"],
        },
      },
    ],
  },
  {
    query: "Tacos El Asador, Toronto",
    city: "Toronto",
    intents: [
      {
        id: "tacos-street-authentic",
        intent:
          "Authentic Mexican street tacos, real al pastor, corn tortillas, don't care about ambiance or seating",
        expectations: {
          dimensionsMustInclude: ["food_quality", "authenticity"],
          dimensionsMustExclude: ["ambiance"],
          weightOrder: ["authenticity", "food_quality"],
        },
      },
    ],
  },
  {
    query: "Lahore Tikka House, Toronto",
    city: "Toronto",
    intents: [
      {
        id: "lahore-spice-value",
        intent:
          "Authentic Pakistani food, real spice levels, generous portions, good value, not a fancy place",
        expectations: {
          dimensionsMustInclude: ["food_quality", "authenticity", "portion_size"],
          weightOrder: ["authenticity", "food_quality", "price_value"],
        },
      },
    ],
  },
  // --- Edge cases ---
  {
    query: "The Keg Steakhouse, Toronto",
    city: "Toronto",
    intents: [
      {
        id: "keg-family-dinner",
        intent: "Family dinner with kids, reliable food, not too loud, good kids menu, easy parking",
        expectations: {
          dimensionsMustInclude: ["service"],
          weightOrder: ["kid_friendliness", "noise_level", "service"],
        },
      },
      {
        id: "keg-steak-quality",
        intent:
          "Best steak quality, proper aging, excellent cuts, serious steakhouse experience",
        pairedWith: "keg-family-dinner",
        expectations: {
          dimensionsMustInclude: ["food_quality"],
          weightOrder: ["food_quality", "authenticity"],
        },
      },
    ],
  },
  // --- Different city ---
  {
    query: "Joe's Pizza, New York",
    city: "New York",
    intents: [
      {
        id: "joes-classic-slice",
        intent:
          "Classic New York slice, thin crust, good fold, no fancy toppings, quick and cheap",
        expectations: {
          dimensionsMustInclude: ["food_quality"],
          weightOrder: ["food_quality", "price_value"],
        },
      },
    ],
  },
  {
    query: "Dishoom, London",
    city: "London",
    intents: [
      {
        id: "dishoom-brunch",
        intent:
          "Vibrant brunch spot, great atmosphere, Bombay-style breakfast, good chai, worth the queue",
        expectations: {
          dimensionsMustInclude: ["food_quality", "ambiance"],
          weightOrder: ["ambiance", "food_quality"],
        },
      },
    ],
  },
  // --- Adversarial: chain with predictable reviews ---
  {
    query: "McDonald's, Times Square New York",
    city: "New York",
    intents: [
      {
        id: "mcdonalds-late-night",
        intent:
          "Late night food, open 24 hours, fast service, cheap, don't care about quality",
        expectations: {
          confidenceShouldBe: "medium",
          weightOrder: ["wait_time", "price_value"],
        },
      },
    ],
  },
];

async function captureAll() {
  for (const spec of SPECS) {
    console.log(`\nSearching: ${spec.query}...`);
    const place = await searchPlace(spec.query);

    if (!place) {
      console.error(`  NOT FOUND: ${spec.query}`);
      continue;
    }

    if (place.reviews.length === 0) {
      console.error(`  NO REVIEWS: ${place.name}`);
      continue;
    }

    console.log(
      `  Found: ${place.name} (${place.rating}/5, ${place.totalReviews} reviews, ${place.reviews.length} fetched)`
    );

    for (const intentSpec of spec.intents) {
      const evalCase: EvalCase = {
        id: intentSpec.id,
        restaurant: place.name,
        city: spec.city,
        intent: intentSpec.intent,
        mockPlace: {
          name: place.name,
          address: place.address,
          placeId: place.placeId,
          rating: place.rating,
          totalReviews: place.totalReviews,
          priceLevel: place.priceLevel,
        },
        mockReviews: place.reviews,
        expectations: intentSpec.expectations,
        pairedWith: intentSpec.pairedWith,
        humanScore: intentSpec.humanScore,
        humanRationale: intentSpec.humanRationale,
      };

      const filepath = join(__dirname, "fixtures", `${intentSpec.id}.json`);
      writeFileSync(filepath, JSON.stringify(evalCase, null, 2) + "\n");
      console.log(`  Saved: ${intentSpec.id}.json`);
    }

    // Rate limit courtesy
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\nDone.");
}

captureAll().catch(console.error);
