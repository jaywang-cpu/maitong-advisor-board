import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRateLimitCount } from "@/lib/db";
import { ensureAdminExists } from "@/lib/setup";

export async function GET(request: Request) {
  await ensureAdminExists();
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const questionsToday = getRateLimitCount(user.id);

  return NextResponse.json({
    user: { ...user, questionsToday, dailyLimit: 30 },
  });
}
