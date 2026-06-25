# Parallax — Product Evolution Plan

## Context

The MVP is deployed and functional but the first real test (Pai Northern Thai Kitchen, Toronto) exposed critical limitations: Google's 5-review ceiling produces too-thin data, the Parallax score barely diverges from Google's (4.5 vs 4.6), confidence was incorrectly "high" when it should be "low," and the explanation was generic. The core pipeline works — decomposition, intent mapping, re-scoring — but needs richer data, rigorous evaluation, better visualization, and eventually native mobile apps.

This plan covers the full product evolution in 5 phases. Phase 0 (Eval) is the foundation — without it, every subsequent change is a gamble.

---

## Phase 0: Eval Framework (Weeks 1-4)

Without evals, you can't tell if adding more data sources or tweaking prompts improves or degrades quality.

### 0A. Infrastructure

Create `lib/eval/` with a CLI runner, test case format, and scoring rubrics.

```
lib/eval/
  runner.ts          — CLI entry: runs suites, compares baselines, generates reports
  types.ts           — EvalCase, EvalResult, Rubric interfaces
  rubrics.ts         — Scoring functions for each eval dimension
  judge.ts           — LLM-as-judge for subjective evals (uses a DIFFERENT model)
  fixtures/          — Frozen JSON test cases (mock reviews, not live API calls)
  reports/           — Git-tracked eval results
```

**EvalCase shape:**
```typescript
interface EvalCase {
  id: string;
  restaurant: string;
  city: string;
  intent: string;
  mockReviews: GoogleReview[];       // Frozen from real API calls
  expectations: {
    scoreShouldBe?: { min: number; max: number };
    confidenceShouldBe?: "high" | "medium" | "low";
    dimensionsMustInclude?: string[];
    dimensionsMustExclude?: string[];
    explanationMustMention?: string[];
  };
  pairedWith?: string;               // Same restaurant, different intent
  humanScore?: number;               // Ground truth
  humanRationale?: string;
}
```

Key decision: eval cases use **mock reviews** (captured from API and frozen), not live calls. Makes evals deterministic, fast, free, and version-controllable.

Scripts: `npm run eval`, `npm run eval:compare`, `npm run eval:report`

### 0B. Seven Eval Dimensions

| # | Dimension | What it measures | Metric |
|---|-----------|-----------------|--------|
| 1 | **Intent-Score Alignment** | Does changing intent produce different scores? | `\|score_A - score_B\|` for opposing intents. Flag if < 0.3 |
| 2 | **Dimension Extraction Accuracy** | Right dimensions extracted from review text? | Precision + recall vs human-labeled dimensions |
| 3 | **Sentiment Accuracy** | Sentiment scores directionally correct? | Sign match (binary) + MAE on magnitude |
| 4 | **Confidence Calibration** | Does confidence reflect actual data coverage? | Exact match: 0/5 mention key dim → "low", 1-2 → "medium", 3+ → "high" |
| 5 | **Explanation Specificity** | Is explanation specific or generic filler? | LLM-as-judge + keyword checks for dimension names, contrasts, specifics |
| 6 | **Weight Coherence** | Do weights reflect stated intent? | Assert relative ordering matches expected (noise_level > portion_size for "quiet dinner") |
| 7 | **Cross-Cuisine Stability** | Equal quality across Thai, Italian, Ethiopian, etc.? | Variance check — no cuisine should systematically score higher/lower |

### 0C. LLM-as-Judge

For explanation specificity and subjective quality, use a **different model** (Claude or GPT-4o) as judge to avoid self-evaluation bias. Prompt asks: "Would this explanation be equally valid for a completely different intent? If yes, score low."

Add `EVAL_JUDGE_API_KEY` to `.env.local`.

### 0D. Regression Detection

- Runner saves results to `lib/eval/reports/YYYY-MM-DD.json` with prompt hash
- `eval:compare` diffs two reports and flags: score drops > 0.5, confidence flips, alignment delta shrinks
- Add GitHub Actions CI: runs evals on PRs that touch `lib/review-analyzer.ts`, posts score diff as PR comment

### 0E. Test Case Library (20+ cases)

| Axis | Cases | Purpose |
|------|-------|---------|
| Intent variety | 6 intents x 1 restaurant | Same data, different viewpoint |
| Cuisine diversity | 1 intent x 6 cuisines | Cross-cuisine stability |
| Review polarity | All positive, all negative, mixed, polarized (1s and 5s) | Edge cases |
| Review sparsity | 1, 3, 5, 10+ reviews | Confidence calibration |
| Dimension coverage | Reviews that cover vs. don't cover intent dimensions | Intent-score alignment |
| Adversarial | Sarcastic, contradictory, non-English reviews | Robustness |

Capture mock reviews by running Google API once and freezing responses. Add human scores for at least 10 cases.

---

## Phase 1: Core Quality Improvements (Weeks 3-6)

Requires Phase 0A-0C to validate changes with evals.

### 1A. Fix Confidence Calibration

Replace LLM-judged confidence with deterministic calculation in `lib/review-analyzer.ts`:
- `totalReviews < 3` → "low"
- `< 30%` of reviews mention key dimensions → "low"
- `< 60%` or `totalReviews < 5` → "medium"
- Otherwise → "high"

Override the LLM's confidence with computed value. Validate with eval dimension 4.

### 1B. Improve Explanation Quality

Constrain the scoring prompt:
- Require template: "For someone looking for [restate intent], [restaurant] scores [higher/lower] because [specific dimension findings]. [Contrast with Google aggregate]."
- Negative constraint: "Do NOT use 'based on the reviews analyzed' or any statement equally valid for a different intent."
- Require at least one specific finding ("3 of 5 reviewers mentioned noise as negative")

Validate with eval dimension 5.

### 1C. Deterministic Score Computation

Move scoring arithmetic from LLM to TypeScript:
- LLM Call 1: decompose reviews into dimensions (unchanged)
- LLM Call 2: map intent → dimension weights ONLY (no score computation)
- New `computeParallaxScore()` function: deterministic weighted average in TypeScript

Makes scores reproducible, debuggable, and testable. The LLM's job becomes purely qualitative.

**File**: `lib/review-analyzer.ts` — add `computeParallaxScore()`, modify `matchAndScore()` to use it.

---

## Phase 2: Multi-Source Data (Weeks 5-10)

Addresses the critical "5 reviews is not enough" problem.

### 2A. Data Source Abstraction

Create `lib/sources/` with a plug-in architecture:

```
lib/sources/
  types.ts           — UnifiedReview, ReviewSource interface
  google-places.ts   — Current code adapted
  yelp.ts            — Yelp Fusion API
  reddit.ts          — Reddit search API
  web-search.ts      — SerpAPI/Brave for blog reviews
  aggregator.ts      — Merge, deduplicate, normalize
```

```typescript
interface UnifiedReview {
  source: "google" | "yelp" | "reddit" | "blog";
  author: string;
  rating?: number;           // Optional — Reddit has no ratings
  text: string;
  date?: string;
  url?: string;
  sourceConfidence: number;  // Google 1.0 > Yelp 0.9 > Reddit 0.6
}

interface ReviewSource {
  name: string;
  fetchReviews(name: string, city: string): Promise<UnifiedReview[]>;
  isAvailable(): boolean;
}
```

### 2B. Source Priority

1. **Google Places** (done): 5 reviews, structured, highest quality
2. **Yelp Fusion API** (Week 6): Free tier, 5K calls/day. Longer, more detailed reviews. Must display Yelp branding per TOS.
3. **Reddit** (Week 7-8): City food subreddits. Unstructured, unrated, but extremely specific on authenticity/quality. Lower sourceConfidence (0.6).
4. **Web Search for Blogs** (Week 8-9): SerpAPI/Brave Search. Expert opinions from food bloggers. Requires HTML parsing.

### 2C. Deduplication & Normalization

- Fuzzy match on author name + text overlap (Jaccard on 3-grams > 0.5) to deduplicate cross-platform
- Time decay: reviews > 2 years old weighted at 0.5
- Source weighting: multiply sourceConfidence into dimension sentiment
- Batch reviews into groups of 8-10 for parallel LLM decomposition calls (20+ reviews exceeds single-call quality)

---

## Phase 3: Richer Visualizations (Weeks 6-10)

Can run partially in parallel with Phase 2 (frontend work).

### 3A. Radar Chart — Dimension Profile

Two overlapping polygons on a radar chart:
- **Google profile** (gray): equal weights across all mentioned dimensions — what Google's aggregate represents
- **Parallax profile** (amber): weighted by your intent — what the score means for you

The visual gap between polygons IS the Parallax insight. Where they diverge, re-scoring matters.

Add `recharts` (~45KB). New component: `components/dimension-radar.tsx`.

Requires adding `googleSentiment` (unweighted average) alongside the existing weighted `averageSentiment` in the analysis output. Both profiles come from the same reviews — different projection.

### 3B. Dimension Delta Bars

Horizontal bar chart per dimension:
- Bar extends left (negative) or right (positive) from center
- Length = `parallaxSentiment - googleSentiment` (how much the dimension shifted for you)
- Color = green if shift favors user, red if against
- Opacity = weight (more important to you = more prominent)

New component: `components/dimension-delta.tsx`. Pure CSS/Tailwind, no charting library needed.

### 3C. Review-to-Dimension Attribution

Click a dimension in radar/delta view → see which reviews contributed, with the relevant sentence highlighted. New component: `components/dimension-detail.tsx`.

Requires extending `DecomposedReview` with a `reviewId` that maps back through the attribution chain.

### 3D. Layout Restructure

Current: linear stack (score → explanation → reviews). New:
- **Desktop**: Two-column. Left: score + radar + delta. Right: explanation + reviews + dimension detail.
- **Mobile**: Vertical stack with dimension detail as expandable drawer.

Modify `app/page.tsx` layout composition.

### 3E. Search History (stretch)

Store past searches in `localStorage`. If user searches same restaurant with different intents, show how Parallax Score shifts. Makes "same data, different viewpoint" tangible. Client-side only.

---

## Phase 4: Google Maps Integration (Weeks 10-12)

### 4A. URL Input

Accept Google Maps URLs in the search field. Detect patterns:
- `maps.google.com/maps/place/...`
- `goo.gl/maps/...`
- `maps.app.goo.gl/...`
- `google.com/maps/place/Restaurant+Name/@lat,lng,...`

Extract place_id or place name. If place_id found, skip text search and call details API directly.

Add `getPlaceByUrl()` to `lib/google-places.ts`. Update `search-form.tsx` to detect URL input.

### 4B. Deep Link Back to Maps

After analysis, add "Get Directions" button that deep links to Google Maps:
- Web: `https://www.google.com/maps/place/?q=place_id:${placeId}`
- Mobile: attempt `comgooglemaps://` first, fall back to web
- Add to `parallax-score.tsx`

### 4C. PWA Shell

Before native apps, validate mobile UX as a PWA:
- `manifest.json` with share target registration (Android can receive Google Maps share intents)
- "Add to Home Screen" on iOS/Android
- Cache last 10 results in IndexedDB
- Service worker for offline access to past results

This is the cheapest way to test mobile demand before investing in native.

---

## Phase 5: Native Mobile Apps (Weeks 12-20)

Only start after validating mobile use case via PWA.

### 5A. API Hardening (Week 12-13)

Before mobile clients hit the API:
- Bearer token auth (simple API key in header)
- Rate limiting (per-IP or per-key)
- Response caching — same restaurant + intent within 24h returns cached result
- OpenAPI spec for `/api/analyze`

### 5B. iOS App (Weeks 13-17)

SwiftUI, iOS 17+. Ahmed shipped Zia in 8 weeks — this is simpler scope.

- Single screen: search + results (mirrors web)
- **Share extension**: receives Google Maps URLs → opens app with URL pre-filled (killer mobile feature)
- URLSession to Vercel API
- SwiftData for search history
- Register `parallax://` URL scheme + universal links
- Location-aware: detect city from GPS to improve search

### 5C. Android App (Weeks 17-20)

Jetpack Compose + Material 3.

- Kotlin coroutines + Retrofit for API
- Share target intent filter for Google Maps URLs (Android's share system is more powerful — can register for specific URL patterns)
- Room for search history
- App Links for deep linking

---

## Phase Sequencing

```
Phase 0 (Eval)         ████████████████████████████
Phase 1 (Quality)            ████████████████
Phase 2 (Data Sources)            ████████████████████████
Phase 3 (Visuals)                  ████████████████████████
Phase 4 (Maps + PWA)                              ████████████
Phase 5 (Native)                                       ████████████████████████
                     Wk 1   2   3   4   5   6   7   8   9  10  11  12  ...  20
```

Dependencies: 0 → 1 → 2 (eval validates quality, quality enables multi-source). 3 runs parallel with 2. 4 independent. 5 requires 4B (API hardening).

---

## Verification

Each phase has its own verification via the eval framework (Phase 0). Additionally:
- **Phase 1**: Run eval suite before/after each change. Regression = revert.
- **Phase 2**: Add multi-source fixtures. Verify dedup with known cross-platform reviews.
- **Phase 3**: Visual testing in browser. Screenshot comparison for layout changes.
- **Phase 4**: Test with 5+ Google Maps URL formats. Test share flow on iOS Safari and Android Chrome.
- **Phase 5**: TestFlight for iOS, internal testing track for Android. Test share sheet integration end-to-end.
