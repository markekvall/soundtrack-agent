const BASE_URL =
  process.env.ES_API_BASE_URL ?? "https://partner-content-api.epidemicsound.com";

export class EsApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly url: string,
  ) {
    super(`Epidemic Sound API ${status} on ${url}: ${body.slice(0, 200)}`);
    this.name = "EsApiError";
  }
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function esBaseUrl(): string {
  return BASE_URL;
}

export async function esFetch(
  pathOrUrl: string,
  init?: RequestInit,
): Promise<Response> {
  const apiKey = process.env.ES_API_KEY;
  if (!apiKey) {
    throw new Error("ES_API_KEY is not set. Add it to .env (see .env.example).");
  }

  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${BASE_URL}${pathOrUrl}`;

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          authorization: `Bearer ${apiKey}`,
          accept: "application/json",
          ...(init?.headers ?? {}),
        },
      });

      if (res.ok) return res;

      if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_ATTEMPTS) {
        const backoffMs = 500 * 2 ** (attempt - 1);
        await sleep(backoffMs);
        continue;
      }

      const body = await res.text();
      throw new EsApiError(res.status, body, url);
    } catch (err) {
      lastError = err;
      if (err instanceof EsApiError) throw err;
      if (attempt < MAX_ATTEMPTS) {
        const backoffMs = 500 * 2 ** (attempt - 1);
        await sleep(backoffMs);
        continue;
      }
    }
  }

  throw lastError ?? new Error(`Epidemic Sound API failed after ${MAX_ATTEMPTS} attempts`);
}
