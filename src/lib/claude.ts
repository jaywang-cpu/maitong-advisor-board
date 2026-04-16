import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const MAX_CONCURRENT = 5;
const TIMEOUT_MS = 90_000;
const TMP_DIR = path.join(process.cwd(), "data", "tmp");

// Ensure tmp dir exists
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

export function callClaude(
  systemPrompt: string,
  userMessage: string,
  model: "sonnet" | "opus" = "sonnet"
): Promise<string> {
  // Write system prompt to temp file to avoid arg length limits
  const tmpFile = path.join(TMP_DIR, `prompt-${crypto.randomUUID()}.txt`);
  fs.writeFileSync(tmpFile, systemPrompt);

  return new Promise((resolve, reject) => {
    const child = execFile(
      "claude",
      ["--print", "--model", model, "--system-prompt-file", tmpFile],
      {
        timeout: TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
        env: { ...process.env },
      },
      (error, stdout) => {
        // Clean up temp file
        try { fs.unlinkSync(tmpFile); } catch {}

        if (error) {
          reject(new Error(`Claude call failed: ${error.message}`));
          return;
        }
        resolve(stdout.trim());
      }
    );

    if (child.stdin) {
      child.stdin.write(userMessage);
      child.stdin.end();
    }
  });
}

export async function callAdvisorsParallel(
  calls: Array<{ advisorName: string; systemPrompt: string; userMessage: string }>,
  model: "sonnet" | "opus" = "sonnet"
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const queue = [...calls];
  const running: Promise<void>[] = [];

  async function processNext() {
    const item = queue.shift();
    if (!item) return;

    try {
      const response = await callClaude(item.systemPrompt, item.userMessage, model);
      results[item.advisorName] = response;
    } catch (err) {
      results[item.advisorName] = `[Error: ${(err as Error).message}]`;
    }

    await processNext();
  }

  for (let i = 0; i < Math.min(MAX_CONCURRENT, calls.length); i++) {
    running.push(processNext());
  }

  await Promise.all(running);
  return results;
}
