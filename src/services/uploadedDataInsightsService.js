const INSIGHTS_ENDPOINT = "/api/insights";
const MAX_CLIENT_PAYLOAD_BYTES = 64 * 1024;

export async function requestUploadedDataInsights({
  analysisMode = "general_insights",
  datasetSummary,
}) {
  if (!datasetSummary) {
    throw new Error("A cleaned dataset summary is required before requesting insights.");
  }

  const requestBody = JSON.stringify({
    analysisMode,
    datasetSummary,
  });
  const payloadSize = new TextEncoder().encode(requestBody).length;

  if (payloadSize > MAX_CLIENT_PAYLOAD_BYTES) {
    throw new Error(
      "The dataset summary is too large for AI insights. Try a dataset with fewer columns.",
    );
  }

  let response;

  try {
    response = await fetch(INSIGHTS_ENDPOINT, {
      body: requestBody,
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch {
    throw new Error(
      "The secure insights API could not be reached. Use Cloudflare Pages dev or check the deployment route.",
    );
  }

  const responseText = await response.text();
  const responseData = parseJsonResponse(responseText);

  if (!response.ok) {
    throw new Error(getErrorMessage(response.status, responseData));
  }

  if (!isValidInsightsResponse(responseData)) {
    throw new Error(
      "The AI response did not match the expected format. Try again or check the server logs.",
    );
  }

  return responseData;
}

function parseJsonResponse(responseText) {
  if (!responseText) return null;

  try {
    return JSON.parse(responseText);
  } catch {
    return null;
  }
}

function getErrorMessage(status, responseData) {
  const serverMessage = responseData?.error?.message || responseData?.message;

  if (serverMessage) return serverMessage;

  if (status === 404) {
    return "The secure Cloudflare insights API is not available locally. Run the app with Cloudflare Pages dev to test AI insights.";
  }

  if (status === 413) {
    return "The dataset summary is too large for AI insights. Try reducing the number of columns.";
  }

  if (status === 429) {
    return "The AI provider is rate limiting requests. Wait a moment and try again.";
  }

  return "AI insights could not be generated right now. Please try again later.";
}

function isValidInsightsResponse(responseData) {
  return (
    responseData &&
    Array.isArray(responseData.insights) &&
    Array.isArray(responseData.recommendations) &&
    Array.isArray(responseData.suggestedCharts) &&
    Array.isArray(responseData.dataQualityNotes) &&
    typeof responseData.modelTrainingPointer === "string"
  );
}
