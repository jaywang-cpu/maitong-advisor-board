import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/db";
import { clearSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/maitong_session=([^;]+)/);
  const token = match?.[1];

  if (token) {
    deleteSession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}
