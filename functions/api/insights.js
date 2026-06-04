const GROQ_CHAT_COMPLETIONS_URL =
  "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const MAX_REQUEST_BYTES = 64 * 1024;
const PROVIDER_TIMEOUT_MS = 25_000;
const ALLOWED_ANALYSIS_MODES = new Set(["general_insights"]);
const ALLOWED_SEVERITIES = new Set(["info", "warning", "opportunity", "risk"]);
const ALLOWED_CHART_TYPES = new Set(["bar", "line", "scatter", "pie", "table"]);

const DEFAULT_MODEL_TRAINING_POINTER =
  "These insights were generated from a summarized, redacted dataset profile only. This app did not train a model, store the uploaded file, or send the full raw dataset.";

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
    return jsonError(405, "Use POST to request dataset insights.");
  }

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError(415, "The insights API accepts JSON requests only.");
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonError(413, "The dataset summary is too large for AI insights.");
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
      analysisMode: requestBody.analysisMode || "general_insights",
      datasetSummary: requestBody.datasetSummary,
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
      "The dataset summary is too large for AI insights.",
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

  const analysisMode = body.analysisMode || "general_insights";
  if (!ALLOWED_ANALYSIS_MODES.has(analysisMode)) {
    return { isValid: false, message: "Unsupported insights analysis mode." };
  }

  const datasetSummary = body.datasetSummary;
  if (!isPlainObject(datasetSummary)) {
    return { isValid: false, message: "A datasetSummary object is required." };
  }

  if (containsRawDatasetKeys(datasetSummary)) {
    return {
      isValid: false,
      message: "Raw rows or full dataset records are not accepted by this API.",
    };
  }

  if (
    !isSafeCount(datasetSummary.rowCount) ||
    !isSafeCount(datasetSummary.columnCount)
  ) {
    return {
      isValid: false,
      message: "datasetSummary rowCount and columnCount must be valid counts.",
    };
  }

  if (!Array.isArray(datasetSummary.columnNames)) {
    return {
      isValid: false,
      message: "datasetSummary columnNames must be an array.",
    };
  }

  if (!Array.isArray(datasetSummary.columns)) {
    return {
      isValid: false,
      message: "datasetSummary columns must be an array of column profiles.",
    };
  }

  if (datasetSummary.columns.length > 100) {
    return {
      isValid: false,
      message: "Too many column profiles were provided for AI insights.",
    };
  }

  return { isValid: true };
}

async function requestGroqInsights({ analysisMode, datasetSummary, env }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      body: JSON.stringify({
        messages: [
          {
            content: buildSystemPrompt(),
            role: "system",
          },
          {
            content: buildUserPrompt({ analysisMode, datasetSummary }),
            role: "user",
          },
        ],
        model: env.AI_MODEL || DEFAULT_MODEL,
        response_format: { type: "json_object" },
        temperature: 0.2,
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
    "You analyze privacy-conscious dataset summaries for a browser-first data insight app.",
    "Analyze only the dataset summary supplied by the user.",
    "Never claim that a model was trained, tuned, or fit on the uploaded data.",
    "Never claim certainty beyond the summarized evidence.",
    "Do not claim a column has mixed data types unless that column's inferredType is mixed or the summary explicitly reports mixed columns.",
    "Identify useful trends, risks, anomalies, opportunities, data quality caveats, next analysis steps, and helpful chart ideas.",
    "If the dataset is too small, incomplete, redacted, or ambiguous, say that strong conclusions are not supported.",
    "Avoid regulated financial, legal, or medical conclusions as facts.",
    "Do not request or expose secrets.",
    "Return strict JSON only. Do not include markdown.",
  ].join(" ");
}

function buildUserPrompt({ analysisMode, datasetSummary }) {
  return JSON.stringify({
    analysisMode,
    datasetSummary,
    responseSchema: {
      dataQualityNotes: ["Short caveat or quality note"],
      insights: [
        {
          description: "Evidence-grounded observation from the summary",
          severity: "info|warning|opportunity|risk",
          title: "Short title",
        },
      ],
      modelTrainingPointer: DEFAULT_MODEL_TRAINING_POINTER,
      recommendations: ["Specific next step"],
      suggestedCharts: [
        {
          chartType: "bar|line|scatter|pie|table",
          reason: "Why this chart could help",
          title: "Short title",
        },
      ],
    },
  });
}

function normalizeInsightsResponse(value) {
  if (!isPlainObject(value)) {
    throw createHttpError(502, "The AI provider returned an invalid response.");
  }

  return {
    dataQualityNotes: normalizeStringArray(value.dataQualityNotes, 5),
    insights: normalizeInsights(value.insights),
    modelTrainingPointer:
      normalizeString(value.modelTrainingPointer, 500) ||
      DEFAULT_MODEL_TRAINING_POINTER,
    recommendations: normalizeStringArray(value.recommendations, 6),
    suggestedCharts: normalizeSuggestedCharts(value.suggestedCharts),
  };
}

function normalizeInsights(insights) {
  const normalizedInsights = ensureArray(insights)
    .slice(0, 6)
    .map((insight) => {
      if (typeof insight === "string") {
        return {
          description: normalizeString(insight, 600),
          severity: "info",
          title: "Dataset insight",
        };
      }

      if (!isPlainObject(insight)) return null;

      const severity = ALLOWED_SEVERITIES.has(insight.severity)
        ? insight.severity
        : "info";

      return {
        description: normalizeString(insight.description, 600),
        severity,
        title: normalizeString(insight.title, 120) || "Dataset insight",
      };
    })
    .filter((insight) => insight?.description);

  if (normalizedInsights.length > 0) return normalizedInsights;

  return [
    {
      description:
        "The summarized dataset does not contain enough evidence for a strong AI-generated observation.",
      severity: "info",
      title: "Limited evidence",
    },
  ];
}

function normalizeSuggestedCharts(charts) {
  return ensureArray(charts)
    .slice(0, 5)
    .map((chart) => {
      if (!isPlainObject(chart)) return null;

      const chartType = ALLOWED_CHART_TYPES.has(chart.chartType)
        ? chart.chartType
        : "table";

      return {
        chartType,
        reason: normalizeString(chart.reason, 300),
        title: normalizeString(chart.title, 120) || "Suggested chart",
      };
    })
    .filter((chart) => chart?.reason);
}

function normalizeStringArray(items, limit) {
  return ensureArray(items)
    .slice(0, limit)
    .map((item) => normalizeString(item, 400))
    .filter(Boolean);
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
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}

function jsonError(status, message) {
  return jsonResponse(
    {
      error: {
        message,
      },
    },
    status,
  );
}

function containsRawDatasetKeys(value) {
  if (!value || typeof value !== "object") return false;

  if (Array.isArray(value)) {
    return value.some((item) => containsRawDatasetKeys(item));
  }

  return Object.entries(value).some(([key, nestedValue]) => {
    const normalizedKey = key.toLowerCase();

    if (
      [
        "cleanedrows",
        "data",
        "originalrows",
        "rawrows",
        "records",
        "rows",
        "samplerows",
      ].includes(normalizedKey)
    ) {
      return true;
    }

    return containsRawDatasetKeys(nestedValue);
  });
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSafeCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}
