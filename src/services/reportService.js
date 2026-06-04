import { DEFAULT_RISK_THRESHOLD } from "../utils/constants";
import { formatCompact, formatCurrency, formatShare } from "../utils/formatters";

export const openPrintableRiskReport = ({
  metrics,
  segmentData,
  regionData,
  aiAnalysis,
  filteredCount,
}) => {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    return;
  }

  const highNetWorthRevenue =
    segmentData.find((segment) => segment.name === "High Net Worth")?.value || 0;
  const generatedAt = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const reportContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Risk & Revenue Report - J.P. Morgan</title>
      <style>
        @media print {
          body { margin: 0; padding: 20px; }
          .no-print { display: none; }
        }
        body {
          font-family: 'Arial', sans-serif;
          color: #1e293b;
          line-height: 1.6;
        }
        .header {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: white;
          padding: 30px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          font-size: 32px;
        }
        .header p {
          margin: 5px 0 0 0;
          opacity: 0.9;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }
        .kpi-box {
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          background: #f8fafc;
        }
        .kpi-title {
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .kpi-value {
          font-size: 28px;
          font-weight: bold;
          color: #0f172a;
        }
        .section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 20px;
          font-weight: bold;
          color: #1e293b;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 8px;
          margin-bottom: 15px;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .data-table th {
          background: #f1f5f9;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #cbd5e1;
        }
        .data-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .insight-box {
          background: #eff6ff;
          border-left: 4px solid #3b82f6;
          padding: 15px;
          margin: 10px 0;
        }
        .recommendation-box {
          background: #f0fdf4;
          border: 2px solid #86efac;
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e2e8f0;
          text-align: center;
          color: #64748b;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Retail Risk & Revenue Analysis</h1>
        <p>J.P. Morgan Portfolio Report | Generated ${generatedAt}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-box">
          <div class="kpi-title">Portfolio Balance</div>
          <div class="kpi-value">${formatCompact(metrics.totalBalance)}</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-title">Annual Revenue</div>
          <div class="kpi-value">${formatCompact(metrics.totalRevenue)}</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-title">Average Risk Score</div>
          <div class="kpi-value">${metrics.avgRisk.toFixed(3)}</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-title">Default Rate</div>
          <div class="kpi-value">${metrics.defaultRate.toFixed(1)}%</div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Segment Performance Analysis</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Segment</th>
              <th>Total Balance</th>
              <th>Annual Revenue</th>
              <th>Customer Count</th>
            </tr>
          </thead>
          <tbody>
            ${segmentData
              .map(
                (segment) => `
              <tr>
                <td><strong>${segment.name}</strong></td>
                <td>${formatCurrency(segment.balance)}</td>
                <td>${formatCurrency(segment.revenue)}</td>
                <td>${segment.count}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2 class="section-title">Regional Revenue Distribution</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Region</th>
              <th>Annual Revenue</th>
              <th>% of Total</th>
            </tr>
          </thead>
          <tbody>
            ${regionData
              .map(
                (region) => `
              <tr>
                <td><strong>${region.name}</strong></td>
                <td>${formatCurrency(region.revenue)}</td>
                <td>${formatShare(region.revenue, metrics.totalRevenue)}%</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      ${
        aiAnalysis
          ? `
        <div class="section">
          <h2 class="section-title">AI-Generated Insights</h2>
          ${aiAnalysis.insights
            .map(
              (insight, index) => `
            <div class="insight-box">
              <strong>Insight ${index + 1}:</strong> ${insight}
            </div>
          `,
            )
            .join("")}

          <div class="recommendation-box">
            <strong style="color: #166534; font-size: 16px;">Strategic Recommendation</strong>
            <p style="margin: 10px 0 0 0; color: #15803d;">${aiAnalysis.recommendation}</p>
          </div>
        </div>
      `
          : ""
      }

      <div class="section">
        <h2 class="section-title">Risk Assessment Summary</h2>
        <p>The current portfolio demonstrates a default rate of <strong>${metrics.defaultRate.toFixed(2)}%</strong>,
        which is ${metrics.defaultRate > DEFAULT_RISK_THRESHOLD ? "above" : "below"} the acceptable threshold of ${DEFAULT_RISK_THRESHOLD}%.
        The average risk score across all accounts is <strong>${metrics.avgRisk.toFixed(3)}</strong>.</p>

        <p>Key observations:</p>
        <ul>
          <li>Total accounts analyzed: <strong>${filteredCount}</strong></li>
          <li>High Net Worth segment contributes approximately <strong>${formatShare(highNetWorthRevenue, metrics.totalRevenue, 0)}%</strong> of total revenue</li>
          <li>Leading region: <strong>${regionData[0]?.name || "N/A"}</strong> with ${regionData[0] ? formatCurrency(regionData[0].revenue) : "N/A"} in annual revenue</li>
        </ul>
      </div>

      <div class="footer">
        <p><strong>Report prepared by:</strong> Lucky J. Daniel | J.P. Morgan Risk Analytics</p>
        <p>This is a demonstration dashboard created with React.js, Recharts, and Groq AI</p>
        <p style="margin-top: 10px; font-style: italic;">Confidential - For Internal Use Only</p>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(reportContent);
  printWindow.document.close();
};
