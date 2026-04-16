import { NextResponse } from "next/server";
import { getCurrentUser, getClientIp } from "@/lib/auth";
import { createInviteCode, logRequest } from "@/lib/db";
import { ensureAdminExists } from "@/lib/setup";

// Only jiaqiang (admin) can generate invite codes
export async function POST(request: Request) {
  await ensureAdminExists();
  const ip = getClientIp(request);
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "jiaqiang") {
    logRequest(user.id, ip, "invite_denied", `${user.name} tried to create invite`);
    return NextResponse.json({ error: "Only admin can generate invite codes" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const hours = (body as { hours?: number }).hours ?? 48;

  const code = createInviteCode(user.id, hours);
  logRequest(user.id, ip, "invite_created", code);

  return NextResponse.json({ code, expiresInHours: hours });
}
