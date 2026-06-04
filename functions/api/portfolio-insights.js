const GROQ_CHAT_COMPLETIONS_URL =
  "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const MAX_REQUEST_BYTES = 16 * 1024;
const PROVIDER_TIMEOUT_MS = 25_000;
const MAX_BREAKDOWN_ITEMS = 50;

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      status: 204,
    });
  }

  if (request.method !== "POST") {
    return jsonError(405, "Use POST to request portfolio insights.");
  }

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError(415, "The insights API accepts JSON requests only.");
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonError(413, "The portfolio snapshot is too large for AI insights.");
  }

  let requestBody;
  try {
    requestBody = await readJsonBody(request);
  } catch (error) {
    return jsonError(error.status || 400, error.message);
  }

  const validation = validateRequestBody(requestBody);
  if (!validation.isValid) {
    return jsonError(400, validation.message);
  }

  if (!env?.GROQ_API_KEY) {
    return jsonError(
      500,
      "AI insights are not configured. Add GROQ_API_KEY as a server-side Cloudflare secret.",
    );
  }

  try {
    const insights = await requestGroqInsights({
      snapshot: validation.snapshot,
      env,
    });

    return jsonResponse(insights);
  } catch (error) {
    return jsonError(
      error.status || 502,
      error.message || "AI insights could not be generated right now.",
    );
  }
}

async function readJsonBody(request) {
  const rawBody = await request.text();
  const bodySize = new TextEncoder().encode(rawBody).length;

  if (bodySize > MAX_REQUEST_BYTES) {
    throw createHttpError(
      413,
      "The portfolio snapshot is too large for AI insights.",
    );
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw createHttpError(400, "Request body must be valid JSON.");
  }
}

function validateRequestBody(body) {
  if (!isPlainObject(body)) {
    return { isValid: false, message: "Request body must be a JSON object." };
  }

  const metrics = body.metrics;
  if (!isPlainObject(metrics)) {
    return { isValid: false, message: "A metrics object is required." };
  }

  const snapshot = {
    metrics: {
      avgRisk: toFiniteNumber(metrics.avgRisk),
      defaultRate: toFiniteNumber(metrics.defaultRate),
      totalBalance: toFiniteNumber(metrics.totalBalance),
      totalRevenue: toFiniteNumber(metrics.totalRevenue),
    },
    regionData: normalizeBreakdown(body.regionData),
    segmentData: normalizeBreakdown(body.segmentData),
  };

  return { isValid: true, snapshot };
}

function normalizeBreakdown(items) {
  return ensureArray(items)
    .slice(0, MAX_BREAKDOWN_ITEMS)
    .map((item) => {
      if (!isPlainObject(item)) return null;
      return {
        name: normalizeString(item.name, 80),
        revenue: toFiniteNumber(item.revenue),
        value: toFiniteNumber(item.value),
      };
    })
    .filter((item) => item?.name);
}

async function requestGroqInsights({ snapshot, env }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      body: JSON.stringify({
        messages: [
          { content: buildSystemPrompt(), role: "system" },
          { content: buildUserPrompt(snapshot), role: "user" },
        ],
        model: env.AI_MODEL || DEFAULT_MODEL,
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw createProviderError(response.status);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw createHttpError(502, "The AI provider returned an empty response.");
    }

    return normalizeInsightsResponse(JSON.parse(content));
  } catch (error) {
    if (error.name === "AbortError") {
      throw createHttpError(504, "The AI provider timed out. Try again later.");
    }

    if (error.status) throw error;

    throw createHttpError(
      502,
      "The AI provider response could not be processed safely.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildSystemPrompt() {
  return [
    "You are a senior risk analyst reviewing a synthetic demo portfolio snapshot.",
    "Analyze only the figures supplied by the user.",
    "Do not invent precise statistics, correlations, or dollar amounts that are not derivable from the snapshot.",
    "Keep conclusions proportional to the limited evidence in the snapshot.",
    "Return strict JSON only. Do not include markdown.",
  ].join(" ");
}

function buildUserPrompt(snapshot) {
  return JSON.stringify({
    instruction:
      "Generate exactly three concise insights and one strategic recommendation for a portfolio manager.",
    responseSchema: {
      insights: ["Insight 1", "Insight 2", "Insight 3"],
      recommendation: "One clear, strategic action.",
    },
    snapshot,
  });
}

function normalizeInsightsResponse(value) {
  if (!isPlainObject(value)) {
    throw createHttpError(502, "The AI provider returned an invalid response.");
  }

  const insights = ensureArray(value.insights)
    .slice(0, 3)
    .map((insight) => normalizeString(insight, 400))
    .filter(Boolean);

  return {
    insights:
      insights.length > 0
        ? insights
        : ["The snapshot does not support a strong AI-generated observation."],
    recommendation:
      normalizeString(value.recommendation, 400) ||
      "Review the snapshot manually before acting.",
  };
}

function normalizeString(value, maxLength) {
  if (typeof value !== "string") return "";

  const trimmedValue = value.trim();
  if (trimmedValue.length <= maxLength) return trimmedValue;

  return `${trimmedValue.slice(0, maxLength - 1)}...`;
}

function createProviderError(status) {
  if (status === 401 || status === 403) {
    return createHttpError(
      502,
      "The AI provider rejected the server-side API key.",
    );
  }

  if (status === 429) {
    return createHttpError(429, "The AI provider is rate limiting requests.");
  }

  return createHttpError(
    502,
    "The AI provider could not generate insights right now.",
  );
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function jsonError(status, message) {
  return jsonResponse({ error: { message } }, status);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toFiniteNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}
