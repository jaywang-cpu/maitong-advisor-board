import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuestionsByUser, getAllQuestions } from "@/lib/db";
import { ensureAdminExists } from "@/lib/setup";

export async function GET(request: Request) {
  await ensureAdminExists();
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "mine";

  let questions;
  if (scope === "team") {
    questions = getAllQuestions(50);
  } else {
    questions = getQuestionsByUser(user.id, 20);
  }

  // Parse the JSON fields
  const parsed = (questions as Array<Record<string, unknown>>).map((q) => ({
    ...q,
    advisor_responses: typeof q.advisor_responses === "string" ? JSON.parse(q.advisor_responses) : q.advisor_responses,
  }));

  return NextResponse.json({ questions: parsed });
}
