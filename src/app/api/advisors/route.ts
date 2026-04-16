import { NextResponse } from "next/server";
import { getAdvisorList, getDepartmentLabels } from "@/lib/advisors";
import { getCurrentUser } from "@/lib/auth";
import { ensureAdminExists } from "@/lib/setup";

export async function GET(request: Request) {
  await ensureAdminExists();
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const advisors = getAdvisorList().map(({ id, name, department }) => ({
    id,
    name,
    department,
  }));
  const departments = getDepartmentLabels();

  return NextResponse.json({ advisors, departments });
}
