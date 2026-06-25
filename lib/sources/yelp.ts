import { ReviewSource, UnifiedReview } from "./types";

interface YelpBusiness {
  id: string;
  name: string;
  rating: number;
  review_count: number;
}

interface YelpReview {
  id: string;
  text: string;
  rating: number;
  time_created: string;
  user: { name: string };
  url: string;
}

export class YelpSource implements ReviewSource {
  name = "yelp";

  isAvailable(): boolean {
    return !!process.env.YELP_API_KEY;
  }

  async fetchReviews(
    restaurantName: string,
    city: string
  ): Promise<UnifiedReview[]> {
    try {
      const business = await this.findBusiness(restaurantName, city);
      if (!business) return [];

      const reviews = await this.getReviews(business.id);
      return reviews.map((r) => ({
        source: "yelp" as const,
        author: r.user.name,
        rating: r.rating,
        text: r.text,
        date: r.time_created.slice(0, 10),
        url: r.url,
        sourceConfidence: 0.9,
      }));
    } catch {
      return [];
    }
  }

  private async findBusiness(
    name: string,
    city: string
  ): Promise<YelpBusiness | null> {
    const params = new URLSearchParams({
      term: name,
      location: city || "Toronto",
      limit: "1",
    });

    const res = await fetch(
      `https://api.yelp.com/v3/businesses/search?${params}`,
      { headers: { Authorization: `Bearer ${process.env.YELP_API_KEY}` } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data.businesses?.[0] ?? null;
  }

  private async getReviews(businessId: string): Promise<YelpReview[]> {
    const res = await fetch(
      `https://api.yelp.com/v3/businesses/${businessId}/reviews?limit=3&sort_by=yelp_sort`,
      { headers: { Authorization: `Bearer ${process.env.YELP_API_KEY}` } }
    );

    if (!res.ok) return [];

    const data = await res.json();
    return data.reviews ?? [];
  }
}
