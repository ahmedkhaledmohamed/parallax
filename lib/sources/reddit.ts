import { ReviewSource, UnifiedReview } from "./types";

interface RedditPost {
  data: {
    title: string;
    selftext: string;
    author: string;
    created_utc: number;
    permalink: string;
    score: number;
  };
}

interface RedditComment {
  data: {
    body?: string;
    author?: string;
    created_utc?: number;
    permalink?: string;
    score?: number;
  };
}

let _accessToken: string | null = null;
let _tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  if (_accessToken && Date.now() < _tokenExpiry) return _accessToken;

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Reddit credentials not set");

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Parallax/1.0",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`Reddit auth failed: ${res.status}`);

  const data = await res.json();
  _accessToken = data.access_token as string;
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return _accessToken!;
}

async function redditGet(path: string): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`https://oauth.reddit.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "Parallax/1.0",
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export class RedditSource implements ReviewSource {
  name = "reddit";

  isAvailable(): boolean {
    return !!process.env.REDDIT_CLIENT_ID && !!process.env.REDDIT_CLIENT_SECRET;
  }

  async fetchReviews(
    restaurantName: string,
    city: string
  ): Promise<UnifiedReview[]> {
    const query = `${restaurantName} ${city}`.trim();
    const reviews: UnifiedReview[] = [];

    try {
      const posts = await this.searchPosts(query);

      for (const post of posts.slice(0, 3)) {
        if (post.data.selftext && post.data.selftext.length > 50) {
          reviews.push({
            source: "reddit",
            author: post.data.author,
            text: post.data.selftext.slice(0, 1000),
            date: new Date(post.data.created_utc * 1000).toISOString().slice(0, 10),
            url: `https://reddit.com${post.data.permalink}`,
            sourceConfidence: 0.6,
          });
        }

        const comments = await this.getComments(post.data.permalink);
        for (const comment of comments.slice(0, 5)) {
          const body = comment.data.body;
          if (!body || body.length < 30 || body === "[deleted]" || body === "[removed]") continue;

          reviews.push({
            source: "reddit",
            author: comment.data.author ?? "anonymous",
            text: body.slice(0, 1000),
            date: comment.data.created_utc
              ? new Date(comment.data.created_utc * 1000).toISOString().slice(0, 10)
              : undefined,
            url: comment.data.permalink
              ? `https://reddit.com${comment.data.permalink}`
              : undefined,
            sourceConfidence: 0.5,
          });
        }
      }
    } catch {
      // Reddit failures are non-fatal
    }

    return reviews;
  }

  private async searchPosts(query: string): Promise<RedditPost[]> {
    const data = await redditGet(
      `/r/food+restaurants+FoodToronto+askTO+toronto+nyc+london/search?q=${encodeURIComponent(query)}&restrict_sr=on&sort=relevance&limit=5&type=link`
    );
    if (!data || typeof data !== "object") return [];
    const listing = data as { data?: { children?: RedditPost[] } };
    return listing.data?.children ?? [];
  }

  private async getComments(permalink: string): Promise<RedditComment[]> {
    const data = await redditGet(`${permalink}?sort=top&limit=10`);
    if (!Array.isArray(data) || data.length < 2) return [];
    const commentListing = data[1] as { data?: { children?: RedditComment[] } };
    return (commentListing.data?.children ?? []).filter(
      (c: RedditComment) => c.data.body && c.data.author !== "AutoModerator"
    );
  }
}
