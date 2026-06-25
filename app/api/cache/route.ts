import { NextRequest, NextResponse } from "next/server";
import { getCacheStats } from "@/lib/cache";

function checkAuth(request: NextRequest): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return true;
  const auth = request.headers.get("authorization");
  if (!auth) return false;
  return auth.replace("Bearer ", "") === password;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getCacheStats();
  return NextResponse.json(stats);
}
