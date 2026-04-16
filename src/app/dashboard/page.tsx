"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Markdown from "@/components/Markdown";

interface User {
  id: string;
  name: string;
  role: string;
  questionsToday: number;
  dailyLimit: number;
}

interface AdvisorInfo {
  id: string;
  name: string;
  department: string;
}

interface AdvisorResponse {
  [advisorName: string]: string;
}

interface SynthesisOverview {
  verdict: string;
  why: string;
  all_agree: string;
  all_worry: string;
  action_steps: string[];
  blind_spots: string;
  risk: string;
}

interface SynthesisData {
  overview: SynthesisOverview;
  departments: Record<string, string>;
}

interface QuestionResult {
  id: string;
  question: string;
  advisorResponses: AdvisorResponse;
  debateResponses?: AdvisorResponse;
  synthesis: string;
  synthesisData?: SynthesisData | null;
}

interface HistoryItem {
  id: string;
  question: string;
  departments?: string;
  advisor_responses: AdvisorResponse;
  synthesis: string;
  created_at: string;
  user_name?: string;
  user_role?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyScope, setHistoryScope] = useState<"mine" | "team">("mine");
  const [expandedAdvisors, setExpandedAdvisors] = useState<Set<string>>(new Set());
  const [inviteCode, setInviteCode] = useState("");
  const [tab, setTab] = useState<"ask" | "history">("ask");
  const resultRef = useRef<HTMLDivElement>(null);

  // Advisor selection
  const [advisors, setAdvisors] = useState<AdvisorInfo[]>([]);
  const [departments, setDepartments] = useState<Record<string, string>>({});
  const [selectedAdvisors, setSelectedAdvisors] = useState<Set<string>>(new Set());
  const [showDebate, setShowDebate] = useState(false);
  const [showDeptDetails, setShowDeptDetails] = useState(false);
  const [historyDeptFilter, setHistoryDeptFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setUser(d.user))
      .catch(() => router.push("/login"));

    fetch("/api/advisors")
      .then((r) => r.json())
      .then((d) => {
        setAdvisors(d.advisors ?? []);
        setDepartments(d.departments ?? {});
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    if (tab === "history" && user) {
      fetch(`/api/history?scope=${historyScope}`)
        .then((r) => r.json())
        .then((d) => setHistory(d.questions ?? []));
    }
  }, [tab, historyScope, user]);

  // Group advisors by department
  const grouped: Record<string, AdvisorInfo[]> = {};
  for (const a of advisors) {
    if (!grouped[a.department]) grouped[a.department] = [];
    grouped[a.department].push(a);
  }

  function toggleAdvisorSelection(id: string) {
    setSelectedAdvisors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleDepartment(dept: string) {
    const deptAdvisors = grouped[dept] ?? [];
    const allSelected = deptAdvisors.every((a) => selectedAdvisors.has(a.id));
    setSelectedAdvisors((prev) => {
      const next = new Set(prev);
      for (const a of deptAdvisors) {
        if (allSelected) next.delete(a.id);
        else next.add(a.id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedAdvisors(new Set(advisors.map((a) => a.id)));
  }

  function selectNone() {
    setSelectedAdvisors(new Set());
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;
    if (selectedAdvisors.size === 0) {
      alert("Please select at least one advisor.");
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          advisorIds: Array.from(selectedAdvisors),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail ? `${data.error}: ${data.detail}` : (data.error ?? "Failed"));
        return;
      }
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      alert("Connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function generateInvite() {
    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours: 48 }),
    });
    const data = await res.json();
    if (res.ok) setInviteCode(data.code);
    else alert(data.error);
  }

  function toggleAdvisor(name: string) {
    setExpandedAdvisors((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a2218] flex items-center justify-center">
        <div className="text-[#4acf85]">Loading...</div>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    jiaqiang: "CTO / Overview",
    yvette: "CEO / Business",
    moira: "Algorithm Engineer",
  };

  // Department display order
  const deptOrder = ["overview", "business", "design", "clinical", "tech", "legal", "finance"];

  return (
    <div className="min-h-screen bg-[#0a2218] text-white">
      {/* Header */}
      <header className="border-b border-[#4acf85]/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-[#4acf85]">MAITONG</h1>
          <span className="text-[#c9a84c] text-sm">Board of Advisors</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            {user.name} ({roleLabels[user.role] ?? user.role}) | {user.questionsToday}/{user.dailyLimit} today
          </span>
          {user.role === "jiaqiang" && (
            <button
              onClick={generateInvite}
              className="text-xs bg-[#c9a84c]/20 text-[#c9a84c] px-3 py-1 rounded hover:bg-[#c9a84c]/30"
            >
              Generate Invite
            </button>
          )}
          <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-400">
            Logout
          </button>
        </div>
      </header>

      {/* Invite code display */}
      {inviteCode && (
        <div className="bg-[#c9a84c]/10 border border-[#c9a84c]/30 mx-6 mt-4 rounded-lg p-3 flex items-center justify-between">
          <span className="text-[#c9a84c] text-sm">
            Invite code: <span className="font-mono font-bold tracking-widest">{inviteCode}</span> (48h)
          </span>
          <button onClick={() => setInviteCode("")} className="text-gray-500 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 px-6 mt-4">
        <button
          onClick={() => setTab("ask")}
          className={`px-4 py-2 text-sm rounded-t-lg ${
            tab === "ask" ? "bg-[#0f2e20] text-[#4acf85] border border-b-0 border-[#4acf85]/20" : "text-gray-500"
          }`}
        >
          Ask the Board
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 text-sm rounded-t-lg ${
            tab === "history" ? "bg-[#0f2e20] text-[#4acf85] border border-b-0 border-[#4acf85]/20" : "text-gray-500"
          }`}
        >
          History
        </button>
      </div>

      <div className="px-6 pb-8">
        <div className="bg-[#0f2e20] rounded-b-xl rounded-tr-xl border border-[#4acf85]/20 p-6">
          {tab === "ask" && (
            <>
              {/* Advisor Selection */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[#4acf85] font-bold text-sm">Select Advisors</h3>
                  <div className="flex gap-2">
                    <button onClick={selectAll} className="text-xs text-[#c9a84c] hover:underline">
                      All
                    </button>
                    <span className="text-gray-600 text-xs">|</span>
                    <button onClick={selectNone} className="text-xs text-gray-500 hover:underline">
                      None
                    </button>
                    <span className="text-gray-600 text-xs ml-2">
                      ({selectedAdvisors.size} selected)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {deptOrder.map((dept) => {
                    const deptAdvisors = grouped[dept];
                    if (!deptAdvisors) return null;
                    const allSelected = deptAdvisors.every((a) => selectedAdvisors.has(a.id));
                    const someSelected = deptAdvisors.some((a) => selectedAdvisors.has(a.id));

                    return (
                      <div
                        key={dept}
                        className="bg-[#0a2218] rounded-lg border border-[#4acf85]/10 p-3"
                      >
                        <button
                          onClick={() => toggleDepartment(dept)}
                          className="flex items-center gap-2 mb-2 w-full text-left"
                        >
                          <span
                            className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center text-[8px] ${
                              allSelected
                                ? "bg-[#4acf85] border-[#4acf85] text-[#0a2218]"
                                : someSelected
                                ? "bg-[#4acf85]/40 border-[#4acf85]"
                                : "border-gray-600"
                            }`}
                          >
                            {allSelected && "✓"}
                          </span>
                          <span className="text-[#c9a84c] text-xs font-bold">
                            {departments[dept] ?? dept}
                          </span>
                        </button>

                        <div className="space-y-1 ml-5">
                          {deptAdvisors.map((a) => (
                            <button
                              key={a.id}
                              onClick={() => toggleAdvisorSelection(a.id)}
                              className="flex items-center gap-2 w-full text-left group"
                            >
                              <span
                                className={`w-2.5 h-2.5 rounded-sm border flex-shrink-0 ${
                                  selectedAdvisors.has(a.id)
                                    ? "bg-[#4acf85] border-[#4acf85]"
                                    : "border-gray-600 group-hover:border-gray-400"
                                }`}
                              />
                              <span
                                className={`text-xs ${
                                  selectedAdvisors.has(a.id) ? "text-white" : "text-gray-500 group-hover:text-gray-300"
                                }`}
                              >
                                {a.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Question input */}
              <form onSubmit={handleAsk} className="mb-6">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask the board of advisors anything about MAITONG..."
                  className="w-full bg-[#0a2218] border border-[#4acf85]/30 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#4acf85] resize-none"
                  rows={4}
                  maxLength={2000}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-600">{question.length}/2000</span>
                  <button
                    type="submit"
                    disabled={loading || !question.trim() || selectedAdvisors.size === 0}
                    className="bg-[#4acf85] text-[#0a2218] font-bold px-6 py-2 rounded-lg hover:bg-[#5ddb96] transition disabled:opacity-50"
                  >
                    {loading
                      ? `${selectedAdvisors.size} advisors thinking...`
                      : `Ask ${selectedAdvisors.size} Advisor${selectedAdvisors.size !== 1 ? "s" : ""}`}
                  </button>
                </div>
              </form>

              {loading && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#4acf85] border-t-transparent mb-4" />
                  <p className="text-[#4acf85] text-sm">
                    Consulting {selectedAdvisors.size} advisors (3 rounds)... This may take a few minutes.
                  </p>
                </div>
              )}

              {result && (
                <div ref={resultRef} className="max-w-4xl mx-auto">
                  {/* OVERALL SECTION */}
                  {result.synthesisData && result.synthesisData.overview ? (
                    <div className="mb-8 bg-[#0a2218] rounded-2xl p-8 border-2 border-[#c9a84c]/40 shadow-lg">
                      <h3 className="text-[#c9a84c] font-bold text-lg mb-6">Board Consensus</h3>

                      {/* Verdict + Why */}
                      <div className="mb-6">
                        <p className="text-white text-lg font-semibold mb-2">{result.synthesisData.overview.verdict}</p>
                        <p className="text-gray-300 text-base leading-7">{result.synthesisData.overview.why}</p>
                      </div>

                      {/* Three columns: Agree / Worry / Action */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-[#0f2e20] rounded-xl p-4 border border-[#4acf85]/20">
                          <h4 className="text-[#4acf85] font-bold text-sm mb-2">All Agree</h4>
                          <p className="text-gray-200 text-sm leading-6">{result.synthesisData.overview.all_agree}</p>
                        </div>
                        <div className="bg-[#0f2e20] rounded-xl p-4 border border-[#c9a84c]/20">
                          <h4 className="text-[#c9a84c] font-bold text-sm mb-2">All Worry About</h4>
                          <p className="text-gray-200 text-sm leading-6">{result.synthesisData.overview.all_worry}</p>
                        </div>
                        <div className="bg-[#0f2e20] rounded-xl p-4 border border-red-900/30">
                          <h4 className="text-red-400 font-bold text-sm mb-2">Blind Spots</h4>
                          <p className="text-gray-200 text-sm leading-6">{result.synthesisData.overview.blind_spots}</p>
                        </div>
                      </div>

                      {/* Action Steps */}
                      <div className="mb-4">
                        <h4 className="text-white font-bold text-sm mb-2">Action Steps</h4>
                        <div className="space-y-2">
                          {result.synthesisData.overview.action_steps.map((step, i) => (
                            <div key={i} className="flex gap-3 items-start">
                              <span className="text-[#4acf85] font-bold text-sm mt-0.5">{i + 1}.</span>
                              <p className="text-gray-200 text-sm leading-6">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Risk */}
                      <div className="bg-red-900/10 rounded-lg px-4 py-3 border border-red-900/20">
                        <span className="text-red-400 text-sm font-bold">Risk: </span>
                        <span className="text-gray-300 text-sm">{result.synthesisData.overview.risk}</span>
                      </div>
                    </div>
                  ) : (
                    /* Fallback: raw markdown if JSON parse failed */
                    <div className="mb-8 bg-[#0a2218] rounded-2xl p-8 border-2 border-[#c9a84c]/40 shadow-lg">
                      <h3 className="text-[#c9a84c] font-bold text-lg mb-4">Board Consensus</h3>
                      <div className="text-base leading-7">
                        <Markdown content={result.synthesis} />
                      </div>
                    </div>
                  )}

                  {/* DEPARTMENT DETAILS — folded by default */}
                  {result.synthesisData && result.synthesisData.departments && Object.keys(result.synthesisData.departments).length > 0 && (
                    <div className="mb-8">
                      <button
                        onClick={() => setShowDeptDetails(!showDeptDetails)}
                        className="w-full bg-[#0a2218] rounded-2xl px-8 py-4 border-2 border-[#4acf85]/30 flex items-center justify-between hover:border-[#4acf85]/50 transition"
                      >
                        <span className="text-[#4acf85] font-bold text-base">
                          Department-Specific Advice
                        </span>
                        <span className="text-gray-500 text-sm">
                          {showDeptDetails ? "- hide" : `+ show (${Object.keys(result.synthesisData.departments).length} departments)`}
                        </span>
                      </button>
                      {showDeptDetails && (
                        <div className="bg-[#0a2218] rounded-b-2xl px-8 pb-8 pt-4 border-2 border-t-0 border-[#4acf85]/30">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(result.synthesisData.departments).map(([dept, advice]) => (
                                <div key={dept} className="bg-[#0f2e20] rounded-xl p-4 border border-[#4acf85]/10">
                                  <h4 className="text-[#c9a84c] font-bold text-sm mb-2">{dept}</h4>
                                  <p className="text-gray-200 text-sm leading-6">{advice}</p>
                                </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Debate round — folded by default */}
                  {result.debateResponses && Object.keys(result.debateResponses).length > 0 && (
                    <div className="mb-8">
                      <button
                        onClick={() => setShowDebate(!showDebate)}
                        className="w-full bg-[#0a2218] rounded-2xl px-8 py-4 border-2 border-red-900/30 flex items-center justify-between hover:border-red-900/50 transition"
                      >
                        <span className="text-red-400 font-bold text-base">
                          Agreement Flow / Debate Details
                        </span>
                        <span className="text-gray-500 text-sm">
                          {showDebate ? "- hide" : "+ show"}
                        </span>
                      </button>
                      {showDebate && (
                        <div className="bg-[#0a2218] rounded-b-2xl px-8 pb-8 pt-4 border-2 border-t-0 border-red-900/30">
                          <div className="space-y-6">
                            {Object.entries(result.debateResponses).map(([name, response]) => (
                              <div key={name} className="border-l-4 border-red-900/50 pl-5">
                                <span className="text-[#4acf85] font-bold text-base block mb-2">{name}</span>
                                <div className="text-base leading-7">
                                  <Markdown content={response} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Individual advisor responses */}
                  <div className="mb-8">
                    <h3 className="text-gray-400 text-sm mb-3">Round 1 — Individual Answers (click to expand):</h3>
                    <div className="space-y-3">
                      {Object.entries(result.advisorResponses).map(([name, response]) => (
                        <div
                          key={name}
                          className="bg-[#0a2218] rounded-xl border border-[#4acf85]/15 overflow-hidden"
                        >
                          <button
                            onClick={() => toggleAdvisor(name)}
                            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#4acf85]/5 transition"
                          >
                            <span className="text-[#4acf85] font-bold">{name}</span>
                            <span className="text-gray-500 text-sm">
                              {expandedAdvisors.has(name) ? "- collapse" : "+ expand"}
                            </span>
                          </button>
                          {expandedAdvisors.has(name) && (
                            <div className="px-6 pb-6 text-base leading-7 border-t border-[#4acf85]/10 pt-4">
                              <Markdown content={response} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "history" && (() => {
              // Parse department tags and filter
              const deptLabelsShort: Record<string, string> = {
                overview: "Overview",
                business: "Business",
                design: "Design",
                clinical: "Clinical",
                tech: "Tech",
                legal: "Legal",
                finance: "Finance",
              };

              const parsedHistory = history.map((item) => {
                let depts: string[] = [];
                if (item.departments) {
                  try { depts = typeof item.departments === "string" ? JSON.parse(item.departments) : item.departments as unknown as string[]; } catch { depts = []; }
                }
                return { ...item, depts };
              });

              const filteredHistory = historyDeptFilter === "all"
                ? parsedHistory
                : parsedHistory.filter((h) => h.depts.includes(historyDeptFilter));

              // Count per department
              const deptCounts: Record<string, number> = {};
              for (const h of parsedHistory) {
                for (const d of h.depts) {
                  deptCounts[d] = (deptCounts[d] ?? 0) + 1;
                }
              }

              return (
                <>
                  {/* Scope: mine / team */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setHistoryScope("mine")}
                      className={`text-xs px-3 py-1 rounded ${
                        historyScope === "mine" ? "bg-[#4acf85]/20 text-[#4acf85]" : "text-gray-500"
                      }`}
                    >
                      My Questions
                    </button>
                    <button
                      onClick={() => setHistoryScope("team")}
                      className={`text-xs px-3 py-1 rounded ${
                        historyScope === "team" ? "bg-[#4acf85]/20 text-[#4acf85]" : "text-gray-500"
                      }`}
                    >
                      Team Feed
                    </button>
                  </div>

                  {/* Department filter */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() => setHistoryDeptFilter("all")}
                      className={`text-xs px-3 py-1 rounded border ${
                        historyDeptFilter === "all"
                          ? "border-[#c9a84c] text-[#c9a84c] bg-[#c9a84c]/10"
                          : "border-gray-700 text-gray-500 hover:border-gray-500"
                      }`}
                    >
                      All ({parsedHistory.length})
                    </button>
                    {deptOrder.map((dept) => {
                      const count = deptCounts[dept] ?? 0;
                      if (count === 0) return null;
                      return (
                        <button
                          key={dept}
                          onClick={() => setHistoryDeptFilter(dept)}
                          className={`text-xs px-3 py-1 rounded border ${
                            historyDeptFilter === dept
                              ? "border-[#c9a84c] text-[#c9a84c] bg-[#c9a84c]/10"
                              : "border-gray-700 text-gray-500 hover:border-gray-500"
                          }`}
                        >
                          {deptLabelsShort[dept] ?? dept} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {filteredHistory.length === 0 ? (
                    <p className="text-gray-600 text-sm">No questions yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {filteredHistory.map((item) => (
                        <div key={item.id} className="bg-[#0a2218] rounded-lg p-4 border border-[#4acf85]/10">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {item.user_name && (
                              <span className="text-[#c9a84c] text-xs">
                                {item.user_name}
                              </span>
                            )}
                            <span className="text-gray-600 text-xs">
                              {new Date(item.created_at).toLocaleString()}
                            </span>
                            {item.depts.map((d) => (
                              <span key={d} className="text-[10px] px-2 py-0.5 rounded bg-[#4acf85]/10 text-[#4acf85] border border-[#4acf85]/20">
                                {deptLabelsShort[d] ?? d}
                              </span>
                            ))}
                          </div>
                          <p className="text-white font-medium text-sm mb-2">{item.question}</p>
                          <details className="text-sm">
                            <summary className="text-[#4acf85] cursor-pointer hover:underline">
                              View board response
                            </summary>
                            <div className="mt-2 text-sm leading-relaxed">
                              <Markdown content={item.synthesis} />
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
        </div>
      </div>
    </div>
  );
}
