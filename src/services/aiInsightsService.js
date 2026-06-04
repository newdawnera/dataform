import { formatCompact, formatCurrency } from "../utils/formatters";

const GROQ_CHAT_COMPLETIONS_URL =
  "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export const AI_INSIGHTS_MISSING_KEY_MESSAGE =
  "Missing Groq API Key. Please add VITE_GROQ_API_KEY to your .env file in the root folder.";

export const AI_INSIGHTS_ERROR_FALLBACK = {
  insights: [
    "Service Unavailable. Please check your API key in the .env file.",
    "Ensure VITE_GROQ_API_KEY is set correctly.",
    "Check browser console for detailed error information.",
  ],
  recommendation: "Proceed with manual analysis or verify API credentials.",
};

export const getBrowserGroqApiKey = () =>
  import.meta.env?.VITE_GROQ_API_KEY || "";

const buildPortfolioInsightsPrompt = ({ metrics, regionData, segmentData }) => `
  You are a Senior Risk Analyst at J.P. Morgan. Analyze the following portfolio snapshot:
  - Total Balance: ${formatCurrency(metrics.totalBalance)}
  - Annual Revenue: ${formatCurrency(metrics.totalRevenue)}
  - Avg Risk Score: ${metrics.avgRisk.toFixed(3)} (Scale 0-1)
  - Default Rate: ${metrics.defaultRate.toFixed(2)}%
  - Top Performing Region: ${regionData[0]?.name || "N/A"} (${regionData[0] ? formatCurrency(regionData[0].revenue) : "N/A"})
  - Segment Breakdown: ${segmentData.map((segment) => `${segment.name}: ${formatCompact(segment.value)} rev`).join(", ")}

  Provide a response in VALID JSON format with exactly this structure:
  {
    "insights": [
      "Insight 1 (focus on revenue vs risk)",
      "Insight 2 (focus on regional or segment trends)",
      "Insight 3 (critical risk warning)"
    ],
    "recommendation": "One clear, strategic action for the Portfolio Manager."
  }
  Do not include markdown formatting. Return only the raw JSON.
`;

export const requestGroqPortfolioInsights = async ({
  apiKey = getBrowserGroqApiKey(),
  metrics,
  regionData,
  segmentData,
}) => {
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful financial analyst assistant that outputs strict JSON.",
        },
        {
          role: "user",
          content: buildPortfolioInsightsPrompt({
            metrics,
            regionData,
            segmentData,
          }),
        },
      ],
      model: GROQ_MODEL,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq API response:", errorText);
    throw new Error(`Groq API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
};
