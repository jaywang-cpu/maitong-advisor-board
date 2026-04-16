"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [role, setRole] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          password,
          ...(isRegistering ? { inviteCode, role } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needsRegistration) {
          setIsRegistering(true);
          setError("New user — enter your invite code and role to register.");
        } else {
          setError(data.error ?? "Login failed");
        }
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a2218] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#4acf85] mb-2">MAITONG</h1>
          <p className="text-[#c9a84c] text-sm">Board of Advisors</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#0f2e20] rounded-xl p-6 shadow-2xl border border-[#4acf85]/20"
        >
          <div className="mb-4">
            <label className="block text-[#4acf85] text-sm mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0a2218] border border-[#4acf85]/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4acf85]"
              placeholder="e.g. jiaqiang"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-[#4acf85] text-sm mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a2218] border border-[#4acf85]/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4acf85]"
              required
            />
          </div>

          {isRegistering && (
            <>
              <div className="mb-4">
                <label className="block text-[#4acf85] text-sm mb-1">Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#0a2218] border border-[#4acf85]/30 rounded-lg px-3 py-2 text-white uppercase tracking-widest focus:outline-none focus:border-[#4acf85]"
                  placeholder="e.g. A1B2C3D4"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-[#4acf85] text-sm mb-1">Your Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#0a2218] border border-[#4acf85]/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4acf85]"
                  required
                >
                  <option value="">Select role...</option>
                  <option value="jiaqiang">Jiaqiang (CTO / Overview)</option>
                  <option value="yvette">Yvette (CEO / Business)</option>
                  <option value="moira">Moira (Algorithm Engineer)</option>
                </select>
              </div>
            </>
          )}

          {error && (
            <div className="mb-4 text-red-400 text-sm bg-red-900/20 rounded-lg p-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4acf85] text-[#0a2218] font-bold py-2 rounded-lg hover:bg-[#5ddb96] transition disabled:opacity-50"
          >
            {loading ? "..." : isRegistering ? "Register" : "Login"}
          </button>

          {!isRegistering && (
            <p className="text-center text-gray-500 text-xs mt-4">
              New team member?{" "}
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="text-[#c9a84c] underline"
              >
                Register with invite code
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
