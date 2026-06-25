# Parallax

Same reviews, your viewpoint.

Customer review scores are broken — they project a high-dimensional taste space onto a single number, destroying the signal that matters: relevance to you. Parallax decomposes reviews into structured dimensional claims and re-scores them based on what you actually care about right now.

## How it works

1. Enter a restaurant name
2. Describe what you're looking for ("quiet date night, authentic Italian, good wine")
3. Parallax fetches reviews, decomposes them into dimensional claims (food quality, noise level, authenticity, service, etc.), and computes a personalized score weighted by your priorities
4. See your Parallax Score vs. the Google average, with the most relevant review excerpts and an explanation of why they differ

## Setup

```bash
cp .env.example .env.local
# Add your API keys to .env.local
npm install
npm run dev
```

### Required API keys

- `GOOGLE_PLACES_API_KEY` — [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with Places API enabled
- `ANTHROPIC_API_KEY` — [Anthropic Console](https://console.anthropic.com/)

## Tech stack

- Next.js 16 (App Router)
- Claude API for review decomposition and re-scoring
- Google Places API for restaurant data and reviews
- Tailwind CSS
