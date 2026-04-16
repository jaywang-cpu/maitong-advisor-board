import { NextResponse } from "next/server";
import { getUserByName, createUser, useInviteCode, createSession, logRequest } from "@/lib/db";
import { hashPassword, verifyPassword, setSessionCookie, getClientIp } from "@/lib/auth";
import { ensureAdminExists } from "@/lib/setup";

export async function POST(request: Request) {
  await ensureAdminExists();
  const ip = getClientIp(request);

  try {
    const body = await request.json();
    const { name, password, inviteCode, role } = body as {
      name?: string;
      password?: string;
      inviteCode?: string;
      role?: string;
    };

    if (!name || !password) {
      logRequest(null, ip, "login_fail", "missing fields");
      return NextResponse.json({ error: "Name and password required" }, { status: 400 });
    }

    const existingUser = getUserByName(name);

    if (existingUser) {
      // Login existing user
      const valid = await verifyPassword(password, existingUser.password_hash);
      if (!valid) {
        logRequest(null, ip, "login_fail", `wrong password for ${name}`);
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
      const token = createSession(existingUser.id);
      logRequest(existingUser.id, ip, "login", "success");

      const response = NextResponse.json({
        user: { id: existingUser.id, name: existingUser.name, role: existingUser.role },
      });
      response.headers.set("Set-Cookie", setSessionCookie(token));
      return response;
    }

    // Register new user — requires invite code
    if (!inviteCode || !role) {
      return NextResponse.json(
        { error: "New user requires invite code and role", needsRegistration: true },
        { status: 400 }
      );
    }

    if (!["jiaqiang", "yvette", "moira"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const hash = await hashPassword(password);
    const userId = createUser(name, role, hash);

    const codeUsed = useInviteCode(inviteCode, userId);
    if (!codeUsed) {
      logRequest(null, ip, "register_fail", `invalid invite code for ${name}`);
      return NextResponse.json({ error: "Invalid or expired invite code" }, { status: 400 });
    }

    const token = createSession(userId);
    logRequest(userId, ip, "register", `new user: ${name}, role: ${role}`);

    const response = NextResponse.json({
      user: { id: userId, name, role },
    });
    response.headers.set("Set-Cookie", setSessionCookie(token));
    return response;
  } catch {
    logRequest(null, ip, "login_error", "server error");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
