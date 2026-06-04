import { REGIONS, SEGMENTS } from "../utils/constants";

export const generatePortfolioData = (recordCount = 200) => {
  const data = [];

  for (let i = 0; i < recordCount; i += 1) {
    const segment = SEGMENTS[Math.floor(Math.random() * SEGMENTS.length)];
    const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];

    let baseBalance;
    let baseLimit;

    if (segment === "High Net Worth") {
      baseBalance = 50000 + Math.random() * 150000;
      baseLimit = 100000;
    } else if (segment === "Affluent") {
      baseBalance = 15000 + Math.random() * 50000;
      baseLimit = 40000;
    } else {
      baseBalance = 1000 + Math.random() * 10000;
      baseLimit = 15000;
    }

    const utilization = Math.min(baseBalance / baseLimit, 1.2);
    let riskScore = Math.random() * 0.4 + utilization * 0.5;
    if (segment === "Mass Market") riskScore += 0.1;
    riskScore = Math.min(Math.max(riskScore, 0.01), 0.99);

    const defaultFlag = Math.random() < (riskScore > 0.75 ? 0.4 : 0.02);
    const annualRevenue = baseBalance * 0.04 + Math.random() * 500;

    data.push({
      customerId: `CUST-${1000 + i}`,
      segment,
      region,
      accountBalance: Math.round(baseBalance),
      creditLimit: baseLimit,
      utilization: parseFloat(utilization.toFixed(2)),
      riskScore: parseFloat(riskScore.toFixed(3)),
      annualRevenue: Math.round(annualRevenue),
      defaultFlag,
    });
  }

  return data;
};
