export interface UnifiedReview {
  source: "google" | "yelp" | "reddit" | "blog";
  author: string;
  rating?: number;
  text: string;
  date?: string;
  url?: string;
  sourceConfidence: number;
}

export interface PlaceInfo {
  name: string;
  address: string;
  placeId: string;
  rating: number;
  totalReviews: number;
  priceLevel?: number;
}

export interface ReviewSource {
  name: string;
  fetchReviews(
    restaurantName: string,
    city: string
  ): Promise<UnifiedReview[]>;
  isAvailable(): boolean;
}
