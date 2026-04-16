import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content");

export function getProjectContext(): string {
  const filePath = path.join(CONTENT_DIR, "project", "MAITONG_CONTEXT.md");
  return fs.readFileSync(filePath, "utf-8");
}

export function getProjectContextShort(): string {
  return `MAITONG — TCM AI diagnostic startup. Pre-hardware, pre-revenue, $50K angel round.
Product: pulse wristband ($149) + tongue diagnosis app + inquiry system → Bayesian fusion → wellness report.
Core insight: Device on PATIENT's wrist, not doctor's — competitors all got this wrong.
Team: 3 (CTO JHU BME, CEO UW BME, Algorithm Engineer JHU BME, ICIC 2025 paper). Hardware engineer NOT hired yet.
Budget: $50K angel. Seed target: $600-700K.
Status: Technical white paper published. Delaware C-Corp in process. No prototype. No real patient data.
Deadlines: YC May 4, Techstars June 10, FastForward ~July 30. Hardware hire within 2.5 months.
Constraints: All current model metrics on open datasets. 83(b) must file within 30 days of share issuance.`;
}

export interface Advisor {
  id: string;
  name: string;
  department: string;
  content: string;
}

const DEPARTMENT_LABELS: Record<string, string> = {
  overview: "Overview",
  business: "Business",
  design: "Design",
  clinical: "Clinical",
  tech: "Tech",
  legal: "Legal",
  finance: "Finance",
};

export function getDepartmentLabels() {
  return DEPARTMENT_LABELS;
}

export function getAdvisorList(): Advisor[] {
  const dir = path.join(CONTENT_DIR, "advisors");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files.map((f) => {
    const content = fs.readFileSync(path.join(dir, f), "utf-8");
    const id = f.replace(".md", "");
    const nameMatch = content.match(/^#\s+(.+?)(?:\s*—|$)/m);
    const name = nameMatch?.[1] ?? id;
    const deptMatch = content.match(/^Department:\s*(.+)$/m);
    const department = deptMatch?.[1]?.trim() ?? "overview";
    return { id, name, department, content };
  });
}

export function getRoleContext(role: string): string {
  const dir = path.join(CONTENT_DIR, "roles");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  for (const f of files) {
    if (f.toLowerCase().includes(role.toLowerCase())) {
      return fs.readFileSync(path.join(dir, f), "utf-8");
    }
  }
  return `The person asking has the role: ${role}. Tailor your answer accordingly.`;
}

// Each advisor gets their own call with full persona
export function buildAdvisorPrompt(
  advisorContent: string,
  roleContext: string,
  department: string
): string {
  const deptLabel = DEPARTMENT_LABELS[department] ?? department;
  const shortContext = getProjectContextShort();
  return `${shortContext}

---

${advisorContent}

---

${roleContext}

---

YOUR DEPARTMENT: ${deptLabel}

STRICT RULES:
- LANGUAGE: Reply in the SAME language as the question. Chinese → Chinese. English → English.
- STAY IN YOUR LANE: You are an expert in ${deptLabel}. ONLY answer from your department's perspective. If the question is outside your expertise, say so briefly for those parts.
- ALWAYS reason from first principles. Break the problem down to fundamental truths.
- NEVER ask the user for more information. NEVER say "send me the feedback" or "share the details". Work with what you have. Make assumptions if needed and state them explicitly.
- ALWAYS give substantive, concrete advice. Minimum 150 words. Analyze deeply from your domain's expertise.
- NO filler: no "Great question", no "I think", no "It's important to note", no "Let me share".
- Format:
  **First principle:** [the fundamental truth from YOUR domain]
  **Why:** [2-3 sentences explaining the reasoning in depth]
  **Verdict:** [one clear sentence]
  **Analysis:** [3-5 sentences of deep, specific analysis from your expertise area. Reference concrete examples, numbers, frameworks.]
  **Action steps:**
  1. [what] → [by when]
  2. ...
  3. ...
- NEVER name specific team members. The team knows their responsibilities.
- Use MAITONG's real numbers ($50K budget, 3-person team, pre-hardware stage).
- If you don't know, say "I don't know".
`;
}

// Each advisor debates individually with full context of others
export function buildDebatePrompt(
  advisorContent: string,
  advisorName: string,
  roleContext: string,
  question: string,
  allAnswers: Record<string, string>
): string {
  let othersBlock = "";
  for (const [name, answer] of Object.entries(allAnswers)) {
    if (name !== advisorName) {
      othersBlock += `\n### ${name}:\n${answer}\n`;
    }
  }

  const shortContext = getProjectContextShort();
  return `${shortContext}

---

${advisorContent}

---

${roleContext}

---

## Original Question:
${question}

## Your first-round answer:
${allAnswers[advisorName]}

## Other advisors said:
${othersBlock}

## React to the other advisors. STRICT FORMAT:

LANGUAGE: Same language as the original question.

**Where I disagree:**
- [Advisor name]: [what they got wrong and why, 1-2 sentences]

**Where they changed my mind:**
- [Advisor name]: [what point convinced you, or "None"]

**What everyone missed:** [blind spots, risks, opportunities nobody mentioned. Skip if nothing.]

**My final answer:** [1-2 sentences, updated or unchanged]

Be blunt. Name advisor names (not team members). No diplomacy.
`;
}

// Synthesis prompt — uses full project context
export function buildSynthesisPrompt(
  question: string,
  advisorAnswers: Record<string, string>,
  debateAnswers: Record<string, string>,
  advisorDepartments: Record<string, string>,
  projectContext: string,
  roleContext: string
): string {
  let answersBlock = "";
  for (const [name, answer] of Object.entries(advisorAnswers)) {
    const dept = advisorDepartments[name] ?? "unknown";
    const deptLabel = DEPARTMENT_LABELS[dept] ?? dept;
    answersBlock += `\n### ${name} [${deptLabel}] — Round 1:\n${answer}\n`;
    if (debateAnswers[name]) {
      answersBlock += `### ${name} — Debate:\n${debateAnswers[name]}\n`;
    }
  }

  return `${projectContext}

---

${roleContext}

---

You are the Board Synthesis Engine for MAITONG. Advisors from different departments answered a question in two rounds.

## Question: ${question}

## All Responses:
${answersBlock}

## Output valid JSON only (no markdown fences, no explanation):

{
  "overview": {
    "verdict": "[one sentence core answer]",
    "why": "[2-3 sentences — the fundamental reasoning]",
    "all_agree": "[what ALL departments agree must happen]",
    "all_worry": "[what ALL departments are concerned about]",
    "action_steps": ["[action] → [by when]", "..."],
    "blind_spots": "[what ALL advisors missed]",
    "risk": "[one sentence — what breaks if wrong]"
  },
  "departments": {
    "Overview": "[specific advice, 2-3 sentences. SKIP if no overview advisors]",
    "Business": "[specific advice]",
    "Design": "[specific advice]",
    "Clinical": "[specific advice]",
    "Tech": "[specific advice]",
    "Legal": "[specific advice]",
    "Finance": "[specific advice]"
  }
}

RULES:
- LANGUAGE: Same language as the question.
- Only include departments with selected advisors. Skip empty ones.
- NEVER name team members.
- NEVER ask the user for more information. Synthesize based on what advisors already said.
- Each department entry should be 3-5 sentences of substantive, specific advice. Not one-liners.
- The "why" field should be 3-4 sentences of deep reasoning.
- Output ONLY the JSON. No markdown fences. No text before or after the JSON.
`;
}
