const PORTFOLIO_INSIGHTS_ENDPOINT = "/api/portfolio-insights";

export const AI_INSIGHTS_ERROR_FALLBACK = {
  insights: [
    "AI insights are unavailable right now.",
    "The secure insights service did not return a result.",
    "Try again shortly, or continue with manual analysis.",
  ],
  recommendation: "Proceed with manual analysis or try again later.",
};

export const requestGroqPortfolioInsights = async ({
  metrics,
  regionData,
  segmentData,
}) => {
  const response = await fetch(PORTFOLIO_INSIGHTS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metrics, regionData, segmentData }),
  });

  if (!response.ok) {
    let message = `Insights request failed: ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody?.error?.message) message = errorBody.error.message;
    } catch {
      // Non-JSON error response; keep the status-based message.
    }
    throw new Error(message);
  }

  return response.json();
};
