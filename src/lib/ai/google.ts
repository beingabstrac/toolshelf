import { createGoogleGenerativeAI } from "@ai-sdk/google";

const MODEL = "gemini-flash-lite-latest";

function readKeys(): string[] {
  const multi = process.env.GOOGLE_GENERATIVE_AI_API_KEYS ?? "";
  const single = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";
  const fromMulti = multi
    .split(/[\s,]+/)
    .map((k) => k.trim())
    .filter(Boolean);
  const keys = [...fromMulti];
  if (single.trim() && !keys.includes(single.trim())) {
    keys.unshift(single.trim());
  }
  return [...new Set(keys)];
}

let keys = readKeys();
let cursor = 0;
const exhausted = new Set<number>();

export function googleKeyCount(): number {
  keys = readKeys();
  return keys.length;
}

function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    statusCode?: number;
    message?: string;
    data?: { error?: { code?: number; status?: string } };
    lastError?: unknown;
  };
  if (e.statusCode === 429) return true;
  if (e.data?.error?.code === 429) return true;
  if (e.data?.error?.status === "RESOURCE_EXHAUSTED") return true;
  const msg = e.message ?? "";
  if (/RESOURCE_EXHAUSTED|quota|rate.?limit|429/i.test(msg)) return true;
  if ("lastError" in e) return isQuotaError(e.lastError);
  return false;
}

function providerAt(i: number) {
  return createGoogleGenerativeAI({ apiKey: keys[i]! });
}

/** Current Gemini Flash Lite model for the active key. */
export function geminiFlash() {
  keys = readKeys();
  if (keys.length === 0) {
    throw new Error(
      "Set GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEYS",
    );
  }
  if (exhausted.size >= keys.length) exhausted.clear();
  while (exhausted.has(cursor % keys.length) && exhausted.size < keys.length) {
    cursor = (cursor + 1) % keys.length;
  }
  return providerAt(cursor % keys.length)(MODEL);
}

/**
 * Run an AI call; on free-tier quota, rotate to the next API key and retry.
 */
export async function withGeminiRotate<T>(
  run: (model: ReturnType<typeof geminiFlash>) => Promise<T>,
): Promise<T> {
  keys = readKeys();
  if (keys.length === 0) {
    throw new Error(
      "Set GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEYS",
    );
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const idx = cursor % keys.length;
    if (exhausted.has(idx) && exhausted.size < keys.length) {
      cursor = (cursor + 1) % keys.length;
      continue;
    }
    try {
      const model = providerAt(idx)(MODEL);
      return await run(model);
    } catch (err) {
      lastError = err;
      if (!isQuotaError(err)) throw err;
      exhausted.add(idx);
      console.warn(
        `[gemini] key ${idx + 1}/${keys.length} quota hit — rotating`,
      );
      cursor = (cursor + 1) % keys.length;
    }
  }
  throw lastError;
}
