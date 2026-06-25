import { GooglePlaceResult } from "./types";

export async function searchPlace(
  query: string
): Promise<GooglePlaceResult | null> {
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

  return {
    name: d.name,
    address: d.formatted_address,
    placeId: topResult.place_id,
    rating: d.rating ?? 0,
    totalReviews: d.user_ratings_total ?? 0,
    priceLevel: d.price_level,
    reviews: (d.reviews ?? []).map(
      (r: { author_name: string; rating: number; text: string; relative_time_description: string }) => ({
        author: r.author_name,
        rating: r.rating,
        text: r.text,
        relativeTime: r.relative_time_description,
      })
    ),
  };
}
