export const filterPortfolioData = (portfolioData, selectedSegment, selectedRegion) =>
  portfolioData.filter((entry) => {
    const segmentMatch =
      selectedSegment === "all" || entry.segment === selectedSegment;
    const regionMatch = selectedRegion === "all" || entry.region === selectedRegion;
    return segmentMatch && regionMatch;
  });

export const calculatePortfolioMetrics = (portfolioData) => {
  const totalBalance = portfolioData.reduce(
    (total, entry) => total + entry.accountBalance,
    0,
  );
  const totalRevenue = portfolioData.reduce(
    (total, entry) => total + entry.annualRevenue,
    0,
  );
  const defaults = portfolioData.filter((entry) => entry.defaultFlag).length;

  if (portfolioData.length === 0) {
    return {
      totalBalance,
      totalRevenue,
      avgRisk: 0,
      defaultRate: 0,
    };
  }

  const avgRisk =
    portfolioData.reduce((total, entry) => total + entry.riskScore, 0) /
    portfolioData.length;
  const defaultRate = (defaults / portfolioData.length) * 100;

  return {
    totalBalance,
    totalRevenue,
    avgRisk,
    defaultRate,
  };
};

export const buildSegmentData = (portfolioData) => {
  const aggregation = {};

  portfolioData.forEach((entry) => {
    if (!aggregation[entry.segment]) {
      aggregation[entry.segment] = {
        name: entry.segment,
        value: 0,
        balance: 0,
        count: 0,
        revenue: 0,
      };
    }

    aggregation[entry.segment].value += entry.annualRevenue;
    aggregation[entry.segment].balance += entry.accountBalance;
    aggregation[entry.segment].revenue += entry.annualRevenue;
    aggregation[entry.segment].count += 1;
  });

  return Object.values(aggregation);
};

export const buildRegionData = (portfolioData) => {
  const aggregation = {};

  portfolioData.forEach((entry) => {
    if (!aggregation[entry.region]) {
      aggregation[entry.region] = { name: entry.region, revenue: 0 };
    }

    aggregation[entry.region].revenue += entry.annualRevenue;
  });

  return Object.values(aggregation).sort((a, b) => b.revenue - a.revenue);
};

export const buildRiskReturnData = (portfolioData) =>
  portfolioData
    .map((entry) => ({
      x: entry.riskScore,
      y: entry.annualRevenue,
      z: entry.segment,
      fill: entry.defaultFlag ? "#ef4444" : "#14b8a6",
    }))
    .slice(0, 150);
