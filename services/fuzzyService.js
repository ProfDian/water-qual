/**
 * ========================================
 * FUZZY LOGIC SERVICE
 * ========================================
 * Wrapper for fuzzyLogicHelper with business logic
 * Provides water quality analysis using fuzzy logic
 *
 * Phase 1: Simple scoring (basic thresholds)
 * Phase 2: Advanced fuzzy logic (dapat di-upgrade nanti)
 */

const fuzzyLogicHelper = require("../utils/fuzzyLogicHelper");

/**
 * ========================================
 * BAKU MUTU THRESHOLDS
 * ========================================
 * Reference: Peraturan Menteri LHK (adjust sesuai kebutuhan)
 */

const THRESHOLDS = {
  ph: {
    min: 6.0,
    max: 9.0,
    optimal_min: 6.5,
    optimal_max: 8.5,
  },
  tds: {
    max: 500, // ppm
    optimal_max: 300,
  },
  turbidity: {
    max: 25, // NTU
    optimal_max: 5,
  },
  temperature: {
    min: 20, // °C
    max: 30,
    optimal_min: 25,
    optimal_max: 28,
  },
};

/**
 * ========================================
 * MAIN ANALYSIS FUNCTION
 * ========================================
 */

/**
 * Analyze water quality data with fuzzy logic
 * @param {Object} inlet - Inlet sensor data { ph, tds, turbidity, temperature }
 * @param {Object} outlet - Outlet sensor data { ph, tds, turbidity, temperature }
 * @returns {Object} Analysis result with score, status, violations
 */
async function analyze(inlet, outlet) {
  try {
    console.log("🧠 Starting fuzzy logic analysis...");
    console.log("   Inlet:", inlet);
    console.log("   Outlet:", outlet);

    // Phase 1: Simple scoring (basic thresholds)
    // Nanti bisa di-upgrade ke advanced fuzzy logic
    const score = calculateSimpleScore(outlet);
    const status = determineStatus(score);
    const violations = checkViolations(outlet);
    const recommendations = generateRecommendations(violations, inlet, outlet);

    const result = {
      quality_score: score,
      status: status,
      violations: violations,
      alert_count: violations.length,
      recommendations: recommendations,
      analysis_method: "simple_threshold", // Phase 1
    };

    console.log("✅ Fuzzy analysis complete:");
    console.log(`   Score: ${score}/100`);
    console.log(`   Status: ${status}`);
    console.log(`   Violations: ${violations.length}`);

    return result;
  } catch (error) {
    console.error("❌ Error in fuzzy analysis:", error);
    throw error;
  }
}

/**
 * ========================================
 * SCORING FUNCTIONS (Phase 1: Simple)
 * ========================================
 */

/**
 * Calculate simple quality score based on thresholds
 * Score: 0-100 (100 = excellent, 0 = very poor)
 */
function calculateSimpleScore(data) {
  let score = 100;
  const deductions = [];

  // 1. Check pH (weight: 25%)
  const phScore = scorePH(data.ph);
  const phDeduction = Math.round((100 - phScore) * 0.25);
  score -= phDeduction;
  if (phDeduction > 0) {
    deductions.push({ parameter: "pH", deduction: phDeduction });
  }

  // 2. Check TDS (weight: 25%)
  const tdsScore = scoreTDS(data.tds);
  const tdsDeduction = Math.round((100 - tdsScore) * 0.25);
  score -= tdsDeduction;
  if (tdsDeduction > 0) {
    deductions.push({ parameter: "TDS", deduction: tdsDeduction });
  }

  // 3. Check Turbidity (weight: 30%)
  const turbidityScore = scoreTurbidity(data.turbidity);
  const turbidityDeduction = Math.round((100 - turbidityScore) * 0.3);
  score -= turbidityDeduction;
  if (turbidityDeduction > 0) {
    deductions.push({ parameter: "Turbidity", deduction: turbidityDeduction });
  }

  // 4. Check Temperature (weight: 20%)
  const tempScore = scoreTemperature(data.temperature);
  const tempDeduction = Math.round((100 - tempScore) * 0.2);
  score -= tempDeduction;
  if (tempDeduction > 0) {
    deductions.push({ parameter: "Temperature", deduction: tempDeduction });
  }

  // Log deductions for debugging
  if (deductions.length > 0) {
    console.log("   Deductions:", deductions);
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, Math.round(score)));

  return score;
}

/**
 * Score pH value (0-100)
 */
function scorePH(ph) {
  const { min, max, optimal_min, optimal_max } = THRESHOLDS.ph;

  if (ph < min || ph > max) {
    // Critical violation
    return 0;
  } else if (ph >= optimal_min && ph <= optimal_max) {
    // Optimal range
    return 100;
  } else if (ph < optimal_min) {
    // Below optimal but above minimum
    const range = optimal_min - min;
    const distance = optimal_min - ph;
    return Math.round(100 - (distance / range) * 50);
  } else {
    // Above optimal but below maximum
    const range = max - optimal_max;
    const distance = ph - optimal_max;
    return Math.round(100 - (distance / range) * 50);
  }
}

/**
 * Score TDS value (0-100)
 */
function scoreTDS(tds) {
  const { max, optimal_max } = THRESHOLDS.tds;

  if (tds > max) {
    // Critical violation
    return 0;
  } else if (tds <= optimal_max) {
    // Optimal range
    return 100;
  } else {
    // Between optimal and max
    const range = max - optimal_max;
    const distance = tds - optimal_max;
    return Math.round(100 - (distance / range) * 100);
  }
}

/**
 * Score Turbidity value (0-100)
 */
function scoreTurbidity(turbidity) {
  const { max, optimal_max } = THRESHOLDS.turbidity;

  if (turbidity > max) {
    // Critical violation
    return 0;
  } else if (turbidity <= optimal_max) {
    // Optimal range
    return 100;
  } else {
    // Between optimal and max
    const range = max - optimal_max;
    const distance = turbidity - optimal_max;
    return Math.round(100 - (distance / range) * 100);
  }
}

/**
 * Score Temperature value (0-100)
 */
function scoreTemperature(temp) {
  const { min, max, optimal_min, optimal_max } = THRESHOLDS.temperature;

  if (temp < min || temp > max) {
    // Critical violation
    return 0;
  } else if (temp >= optimal_min && temp <= optimal_max) {
    // Optimal range
    return 100;
  } else if (temp < optimal_min) {
    // Below optimal but above minimum
    const range = optimal_min - min;
    const distance = optimal_min - temp;
    return Math.round(100 - (distance / range) * 50);
  } else {
    // Above optimal but below maximum
    const range = max - optimal_max;
    const distance = temp - optimal_max;
    return Math.round(100 - (distance / range) * 50);
  }
}

/**
 * ========================================
 * STATUS DETERMINATION
 * ========================================
 */

/**
 * Determine water quality status from score
 */
function determineStatus(score) {
  if (score >= 85) {
    return "excellent";
  } else if (score >= 70) {
    return "good";
  } else if (score >= 50) {
    return "fair";
  } else if (score >= 30) {
    return "poor";
  } else {
    return "critical";
  }
}

/**
 * ========================================
 * VIOLATION DETECTION
 * ========================================
 */

/**
 * Check for threshold violations
 * Returns array of violations with details
 */
function checkViolations(data) {
  const violations = [];

  // Check pH
  if (data.ph < THRESHOLDS.ph.min || data.ph > THRESHOLDS.ph.max) {
    violations.push({
      parameter: "ph",
      location: "outlet",
      value: data.ph,
      threshold:
        data.ph < THRESHOLDS.ph.min ? THRESHOLDS.ph.min : THRESHOLDS.ph.max,
      condition:
        data.ph < THRESHOLDS.ph.min ? "below_minimum" : "above_maximum",
      severity: determineSeverity("ph", data.ph),
      message: `pH outlet (${data.ph.toFixed(2)}) ${
        data.ph < THRESHOLDS.ph.min ? "di bawah" : "melebihi"
      } batas aman (${
        data.ph < THRESHOLDS.ph.min ? THRESHOLDS.ph.min : THRESHOLDS.ph.max
      })`,
    });
  }

  // Check TDS
  if (data.tds > THRESHOLDS.tds.max) {
    violations.push({
      parameter: "tds",
      location: "outlet",
      value: data.tds,
      threshold: THRESHOLDS.tds.max,
      condition: "above_maximum",
      severity: determineSeverity("tds", data.tds),
      message: `TDS outlet (${data.tds.toFixed(1)} ppm) melebihi batas aman (${
        THRESHOLDS.tds.max
      } ppm)`,
    });
  }

  // Check Turbidity
  if (data.turbidity > THRESHOLDS.turbidity.max) {
    violations.push({
      parameter: "turbidity",
      location: "outlet",
      value: data.turbidity,
      threshold: THRESHOLDS.turbidity.max,
      condition: "above_maximum",
      severity: determineSeverity("turbidity", data.turbidity),
      message: `Turbidity outlet (${data.turbidity.toFixed(
        1
      )} NTU) melebihi batas aman (${THRESHOLDS.turbidity.max} NTU)`,
    });
  }

  // Check Temperature
  if (
    data.temperature < THRESHOLDS.temperature.min ||
    data.temperature > THRESHOLDS.temperature.max
  ) {
    violations.push({
      parameter: "temperature",
      location: "outlet",
      value: data.temperature,
      threshold:
        data.temperature < THRESHOLDS.temperature.min
          ? THRESHOLDS.temperature.min
          : THRESHOLDS.temperature.max,
      condition:
        data.temperature < THRESHOLDS.temperature.min
          ? "below_minimum"
          : "above_maximum",
      severity: determineSeverity("temperature", data.temperature),
      message: `Temperature outlet (${data.temperature.toFixed(1)}°C) ${
        data.temperature < THRESHOLDS.temperature.min ? "di bawah" : "melebihi"
      } batas aman (${
        data.temperature < THRESHOLDS.temperature.min
          ? THRESHOLDS.temperature.min
          : THRESHOLDS.temperature.max
      }°C)`,
    });
  }

  return violations;
}

/**
 * Determine severity level for a violation
 */
function determineSeverity(parameter, value) {
  const threshold = THRESHOLDS[parameter];

  if (parameter === "ph") {
    const deviation = Math.max(
      Math.abs(value - threshold.min),
      Math.abs(value - threshold.max)
    );

    if (deviation > 2.0) return "critical";
    if (deviation > 1.0) return "high";
    if (deviation > 0.5) return "medium";
    return "low";
  }

  if (parameter === "tds") {
    const ratio = value / threshold.max;
    if (ratio > 2.0) return "critical";
    if (ratio > 1.5) return "high";
    if (ratio > 1.2) return "medium";
    return "low";
  }

  if (parameter === "turbidity") {
    const ratio = value / threshold.max;
    if (ratio > 2.0) return "critical";
    if (ratio > 1.5) return "high";
    if (ratio > 1.2) return "medium";
    return "low";
  }

  if (parameter === "temperature") {
    const deviation = Math.max(
      Math.abs(value - threshold.min),
      Math.abs(value - threshold.max)
    );

    if (deviation > 10) return "critical";
    if (deviation > 5) return "high";
    if (deviation > 3) return "medium";
    return "low";
  }

  return "low";
}

/**
 * ========================================
 * RECOMMENDATIONS
 * ========================================
 */

/**
 * Generate recommendations based on violations and data
 */
function generateRecommendations(violations, inlet, outlet) {
  const recommendations = [];

  if (violations.length === 0) {
    recommendations.push({
      type: "maintenance",
      priority: "low",
      message: "Kualitas air baik. Lanjutkan pemeliharaan rutin IPAL.",
    });
    return recommendations;
  }

  // Recommendations based on violations
  violations.forEach((violation) => {
    switch (violation.parameter) {
      case "ph":
        if (violation.value < THRESHOLDS.ph.min) {
          recommendations.push({
            type: "treatment",
            priority: violation.severity,
            message:
              "pH terlalu rendah (asam). Pertimbangkan penambahan basa untuk menetralkan.",
          });
        } else {
          recommendations.push({
            type: "treatment",
            priority: violation.severity,
            message:
              "pH terlalu tinggi (basa). Pertimbangkan penambahan asam untuk menetralkan.",
          });
        }
        break;

      case "tds":
        recommendations.push({
          type: "treatment",
          priority: violation.severity,
          message:
            "TDS tinggi. Periksa sistem filtrasi dan pertimbangkan pembersihan filter.",
        });
        break;

      case "turbidity":
        recommendations.push({
          type: "treatment",
          priority: violation.severity,
          message: "Turbidity tinggi. Periksa sistem sedimentasi dan filtrasi.",
        });
        break;

      case "temperature":
        recommendations.push({
          type: "monitoring",
          priority: violation.severity,
          message:
            "Temperature di luar range normal. Monitor kondisi lingkungan.",
        });
        break;
    }
  });

  // Check treatment effectiveness (inlet vs outlet)
  const effectiveness = evaluateTreatmentEffectiveness(inlet, outlet);
  if (!effectiveness.isEffective) {
    recommendations.push({
      type: "maintenance",
      priority: "high",
      message:
        "Efektivitas IPAL rendah. Lakukan inspeksi dan maintenance komprehensif.",
    });
  }

  return recommendations;
}

/**
 * Evaluate IPAL treatment effectiveness
 */
function evaluateTreatmentEffectiveness(inlet, outlet) {
  const improvements = {
    tds: ((inlet.tds - outlet.tds) / inlet.tds) * 100,
    turbidity: ((inlet.turbidity - outlet.turbidity) / inlet.turbidity) * 100,
  };

  // Treatment is effective if TDS and turbidity reduced significantly
  const isEffective = improvements.tds > 10 && improvements.turbidity > 20;

  return {
    isEffective,
    improvements,
  };
}

/**
 * ========================================
 * ADVANCED FUZZY LOGIC (Phase 2 - Future)
 * ========================================
 * Uncomment and implement when ready for advanced fuzzy
 */

/**
 * Advanced fuzzy logic analysis (Phase 2)
 * @param {Object} inlet
 * @param {Object} outlet
 * @returns {Object} Advanced fuzzy analysis
 */
/*
async function analyzeAdvancedFuzzy(inlet, outlet) {
  // TODO: Implement advanced fuzzy logic
  // 1. Fuzzification (membership functions)
  // 2. Inference (fuzzy rules)
  // 3. Defuzzification
  
  // Call fuzzyLogicHelper functions here
  const fuzzyResult = await fuzzyLogicHelper.process(inlet, outlet);
  
  return fuzzyResult;
}
*/

/**
 * ========================================
 * EXPORTS
 * ========================================
 */

module.exports = {
  // Main function
  analyze,

  // Helper functions (exported for testing)
  calculateSimpleScore,
  determineStatus,
  checkViolations,
  determineSeverity,
  generateRecommendations,

  // Thresholds (exported for reference)
  THRESHOLDS,
};

console.log("📦 fuzzyService loaded");
