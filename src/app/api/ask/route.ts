import { NextResponse } from "next/server";
import { getCurrentUser, getClientIp } from "@/lib/auth";
import { checkRateLimit, incrementRateLimit, saveQuestion, logRequest } from "@/lib/db";
import {
  getProjectContext,
  getAdvisorList,
  getRoleContext,
  buildAdvisorPrompt,
  buildDebatePrompt,
  buildSynthesisPrompt,
} from "@/lib/advisors";
import { callAdvisorsParallel, callClaude } from "@/lib/claude";
import { ensureAdminExists } from "@/lib/setup";

export async function POST(request: Request) {
  await ensureAdminExists();
  const ip = getClientIp(request);
  const user = await getCurrentUser(request);

  if (!user) {
    logRequest(null, ip, "ask_unauthorized", "no session");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(user.id)) {
    logRequest(user.id, ip, "ask_rate_limited", "daily limit reached");
    return NextResponse.json(
      { error: "Daily question limit reached (30/day). Try again tomorrow." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { question, advisorIds } = body as { question?: string; advisorIds?: string[] };

    if (!question || question.trim().length === 0) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    if (question.length > 2000) {
      return NextResponse.json({ error: "Question too long (max 2000 chars)" }, { status: 400 });
    }

    logRequest(user.id, ip, "ask", question.slice(0, 100));
    incrementRateLimit(user.id);

    const projectContext = getProjectContext();
    const roleContext = getRoleContext(user.role);
    const allAdvisors = getAdvisorList();

    const advisors = advisorIds && advisorIds.length > 0
      ? allAdvisors.filter((a) => advisorIds.includes(a.id))
      : allAdvisors;

    const advisorDepartments: Record<string, string> = {};
    for (const a of advisors) {
      advisorDepartments[a.name] = a.department;
    }

    // ROUND 1: Each advisor answers independently in parallel (Sonnet, fast)
    const calls = advisors.map((advisor) => ({
      advisorName: advisor.name,
      systemPrompt: buildAdvisorPrompt(advisor.content, roleContext, advisor.department),
      userMessage: question,
    }));
    const advisorResponses = await callAdvisorsParallel(calls, "sonnet");

    // ROUND 2: Debate — skip if <= 2 advisors
    let debateResponses: Record<string, string> = {};
    if (advisors.length > 2) {
      const debateCalls = advisors.map((advisor) => ({
        advisorName: advisor.name,
        systemPrompt: buildDebatePrompt(
          advisor.content, advisor.name, roleContext, question, advisorResponses
        ),
        userMessage: "React to the other advisors now.",
      }));
      debateResponses = await callAdvisorsParallel(debateCalls, "sonnet");
    }

    // ROUND 3: Synthesis
    const synthesisPrompt = buildSynthesisPrompt(
      question, advisorResponses, debateResponses, advisorDepartments, projectContext, roleContext
    );
    const synthesisRaw = await callClaude(synthesisPrompt, question, "sonnet");

    // Parse JSON
    let synthesisData = null;
    try {
      const cleaned = synthesisRaw.replace(/^```json?\s*/m, "").replace(/\s*```$/m, "").trim();
      synthesisData = JSON.parse(cleaned);
    } catch {
      synthesisData = null;
    }

    const usedDepartments = [...new Set(advisors.map((a) => a.department))];
    const questionId = saveQuestion(
      user.id, question,
      { ...advisorResponses, _debate: JSON.stringify(debateResponses) },
      synthesisRaw, usedDepartments
    );

    return NextResponse.json({
      id: questionId, question, advisorResponses, debateResponses,
      synthesis: synthesisRaw, synthesisData,
    });
  } catch (err) {
    const msg = (err as Error).message;
    console.error("ASK ERROR:", msg, (err as Error).stack);
    logRequest(user.id, ip, "ask_error", msg);
    return NextResponse.json({ error: "Failed to process question", detail: msg }, { status: 500 });
  }
}
