function analyzeTreatmentQuality(inlet, outlet) {
  const rules = [];
  let status = "normal";
  let score = 100;

  // Rule 1: pH Deviation (F-14)
  const phDiff = Math.abs(inlet.ph - outlet.ph);
  if (phDiff > 1.0) {
    rules.push({ rule: "pH_CRITICAL", diff: phDiff, severity: "critical" });
    status = "alert";
    score -= 30;
  } else if (phDiff > 0.5) {
    rules.push({ rule: "pH_WARNING", diff: phDiff, severity: "warning" });
    status = status === "normal" ? "warning" : status;
    score -= 15;
  }

  // Rule 2: TDS Reduction Efficiency
  const tdsReduction = ((inlet.tds - outlet.tds) / inlet.tds) * 100;
  if (tdsReduction < 20) {
    rules.push({
      rule: "TDS_INEFFICIENT",
      reduction: tdsReduction,
      severity: "critical",
    });
    status = "alert";
    score -= 40;
  } else if (tdsReduction < 40) {
    rules.push({
      rule: "TDS_SUBOPTIMAL",
      reduction: tdsReduction,
      severity: "warning",
    });
    status = status === "normal" ? "warning" : status;
    score -= 20;
  }

  // Rule 3: Turbidity Reduction
  const turbReduction =
    ((inlet.turbidity - outlet.turbidity) / inlet.turbidity) * 100;
  if (turbReduction < 30) {
    rules.push({
      rule: "TURBIDITY_LOW",
      reduction: turbReduction,
      severity: "warning",
    });
    status = status === "normal" ? "warning" : status;
    score -= 10;
  }

  // Rule 4: Temperature Anomaly
  const tempDiff = Math.abs(inlet.temperature - outlet.temperature);
  if (tempDiff > 5) {
    rules.push({ rule: "TEMP_ANOMALY", diff: tempDiff, severity: "warning" });
  }

  return {
    status,
    score: Math.max(score, 0),
    triggeredRules: rules,
    summary: generateSummary(rules),
  };
}

module.exports = { analyzeTreatmentQuality };
