import { NextRequest } from "next/server";

export function validateApiKey(request: NextRequest): boolean {
  const apiKey = process.env.PARALLAX_API_KEY;
  if (!apiKey) return true;

  const origin = request.headers.get("origin") ?? "";
  const host = request.headers.get("host") ?? "";
  if (origin && (origin.includes(host) || origin.includes("localhost"))) {
    return true;
  }

  const referer = request.headers.get("referer") ?? "";
  if (referer && (referer.includes(host) || referer.includes("localhost"))) {
    return true;
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  return token === apiKey;
}
