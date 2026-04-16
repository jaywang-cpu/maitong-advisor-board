import { getUserByName, createUser, createInviteCode } from "./db";
import { hashPassword } from "./auth";

let initialized = false;

export async function ensureAdminExists() {
  if (initialized) return;

  const admin = getUserByName("jiaqiang");
  if (!admin) {
    try {
      const hash = await hashPassword(process.env.ADMIN_PASSWORD ?? "maitong2026");
      const id = createUser("jiaqiang", "jiaqiang", hash);
      const code = createInviteCode(id, 24 * 365);
      console.log(`\n========================================`);
      console.log(`  Admin account created: jiaqiang`);
      console.log(`  Default password: maitong2026`);
      console.log(`  Invite code for team: ${code}`);
      console.log(`========================================\n`);
    } catch {
      // Already created by another concurrent call
    }
  }

  initialized = true;
}
