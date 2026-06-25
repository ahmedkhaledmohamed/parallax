import { ReviewSource, UnifiedReview, PlaceInfo } from "./types";

export interface GooglePlaceSearchResult {
  place: PlaceInfo;
  reviews: UnifiedReview[];
}

const MAPS_URL_PATTERNS = [
  /place_id[=:]([A-Za-z0-9_-]+)/,
  /maps\/place\/([^/@]+)/,
  /maps\?.*q=([^&]+)/,
];

export function isGoogleMapsUrl(input: string): boolean {
  return /(?:maps\.google\.|google\.\w+\/maps|goo\.gl\/maps|maps\.app\.goo\.gl)/.test(
    input
  );
}

export function extractFromMapsUrl(url: string): {
  placeId?: string;
  placeName?: string;
} {
  for (const pattern of MAPS_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      const value = decodeURIComponent(match[1].replace(/\+/g, " "));
      if (pattern === MAPS_URL_PATTERNS[0]) {
        return { placeId: value };
      }
      return { placeName: value };
    }
  }
  return {};
}

export class GooglePlacesSource implements ReviewSource {
  name = "google";

  isAvailable(): boolean {
    return !!process.env.GOOGLE_PLACES_API_KEY;
  }

  async fetchReviews(
    restaurantName: string,
    _city: string
  ): Promise<UnifiedReview[]> {
    const result = await this.searchPlace(restaurantName);
    return result?.reviews ?? [];
  }

  async searchPlace(
    query: string
  ): Promise<GooglePlaceSearchResult | null> {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not set");

    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
    );
    const searchData = await searchRes.json();

    if (!searchData.results?.length) return null;

    const topResult = searchData.results[0];

    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${topResult.place_id}&fields=name,formatted_address,rating,user_ratings_total,price_level,reviews&key=${apiKey}`
    );
    const detailsData = await detailsRes.json();
    const d = detailsData.result;

    const place: PlaceInfo = {
      name: d.name,
      address: d.formatted_address,
      placeId: topResult.place_id,
      rating: d.rating ?? 0,
      totalReviews: d.user_ratings_total ?? 0,
      priceLevel: d.price_level,
    };

    const reviews: UnifiedReview[] = (d.reviews ?? []).map(
      (r: {
        author_name: string;
        rating: number;
        text: string;
        relative_time_description: string;
      }) => ({
        source: "google" as const,
        author: r.author_name,
        rating: r.rating,
        text: r.text,
        date: r.relative_time_description,
        sourceConfidence: 1.0,
      })
    );

    return { place, reviews };
  }

  async getPlaceById(
    placeId: string
  ): Promise<GooglePlaceSearchResult | null> {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not set");

    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,rating,user_ratings_total,price_level,reviews&key=${apiKey}`
    );
    const detailsData = await detailsRes.json();
    if (!detailsData.result) return null;

    const d = detailsData.result;

    const place: PlaceInfo = {
      name: d.name,
      address: d.formatted_address,
      placeId,
      rating: d.rating ?? 0,
      totalReviews: d.user_ratings_total ?? 0,
      priceLevel: d.price_level,
    };

    const reviews: UnifiedReview[] = (d.reviews ?? []).map(
      (r: {
        author_name: string;
        rating: number;
        text: string;
        relative_time_description: string;
      }) => ({
        source: "google" as const,
        author: r.author_name,
        rating: r.rating,
        text: r.text,
        date: r.relative_time_description,
        sourceConfidence: 1.0,
      })
    );

    return { place, reviews };
  }

  async getPlaceByUrl(
    url: string
  ): Promise<GooglePlaceSearchResult | null> {
    const { placeId, placeName } = extractFromMapsUrl(url);
    if (placeId) return this.getPlaceById(placeId);
    if (placeName) return this.searchPlace(placeName);
    return null;
  }
}
