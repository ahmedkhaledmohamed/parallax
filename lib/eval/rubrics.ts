import { AnalysisResult, DecomposedReview } from "../types";
import { EvalCase, RubricScore } from "./types";

export function scoreConfidenceCalibration(
  result: AnalysisResult,
  decomposed: DecomposedReview[],
  evalCase: EvalCase
): RubricScore {
  if (!evalCase.expectations.confidenceShouldBe) {
    return {
      dimension: "confidence_calibration",
      score: 1,
      maxScore: 1,
      passed: true,
      details: "No confidence expectation set — skipped",
    };
  }

  const expected = evalCase.expectations.confidenceShouldBe;
  const actual = result.confidence;
  const passed = actual === expected;

  return {
    dimension: "confidence_calibration",
    score: passed ? 1 : 0,
    maxScore: 1,
    passed,
    details: passed
      ? `Confidence correctly reported as "${actual}"`
      : `Expected "${expected}" but got "${actual}"`,
  };
}

export function scoreDimensionExtraction(
  decomposed: DecomposedReview[],
  evalCase: EvalCase
): RubricScore {
  const mustInclude = evalCase.expectations.dimensionsMustInclude ?? [];
  const mustExclude = evalCase.expectations.dimensionsMustExclude ?? [];

  if (mustInclude.length === 0 && mustExclude.length === 0) {
    return {
      dimension: "dimension_extraction",
      score: 1,
      maxScore: 1,
      passed: true,
      details: "No dimension expectations set — skipped",
    };
  }

  const allDimensions = new Set(
    decomposed.flatMap((r) => r.dimensions.map((d) => d.dimension))
  );

  const found = mustInclude.filter((d) => allDimensions.has(d));
  const missing = mustInclude.filter((d) => !allDimensions.has(d));
  const unwanted = mustExclude.filter((d) => allDimensions.has(d));

  const total = mustInclude.length + mustExclude.length;
  const correct = found.length + (mustExclude.length - unwanted.length);
  const passed = missing.length === 0 && unwanted.length === 0;

  const parts: string[] = [];
  if (found.length > 0) parts.push(`Found: ${found.join(", ")}`);
  if (missing.length > 0) parts.push(`Missing: ${missing.join(", ")}`);
  if (unwanted.length > 0) parts.push(`Unwanted: ${unwanted.join(", ")}`);

  return {
    dimension: "dimension_extraction",
    score: correct,
    maxScore: total,
    passed,
    details: parts.join(". "),
  };
}

export function scoreScoreRange(
  result: AnalysisResult,
  evalCase: EvalCase
): RubricScore {
  if (!evalCase.expectations.scoreShouldBe) {
    return {
      dimension: "score_range",
      score: 1,
      maxScore: 1,
      passed: true,
      details: "No score expectation set — skipped",
    };
  }

  const { min, max } = evalCase.expectations.scoreShouldBe;
  const actual = result.parallaxScore;
  const passed = actual >= min && actual <= max;

  return {
    dimension: "score_range",
    score: passed ? 1 : 0,
    maxScore: 1,
    passed,
    details: passed
      ? `Score ${actual} within expected range [${min}, ${max}]`
      : `Score ${actual} outside expected range [${min}, ${max}]`,
  };
}

export function scoreExplanationContent(
  result: AnalysisResult,
  evalCase: EvalCase
): RubricScore {
  const mustMention = evalCase.expectations.explanationMustMention ?? [];
  const mustNotContain = evalCase.expectations.explanationMustNotContain ?? [];

  if (mustMention.length === 0 && mustNotContain.length === 0) {
    return {
      dimension: "explanation_content",
      score: 1,
      maxScore: 1,
      passed: true,
      details: "No explanation expectations set — skipped",
    };
  }

  const explanation = result.explanation.toLowerCase();
  const mentioned = mustMention.filter((term) =>
    explanation.includes(term.toLowerCase())
  );
  const missingTerms = mustMention.filter(
    (term) => !explanation.includes(term.toLowerCase())
  );
  const badTerms = mustNotContain.filter((term) =>
    explanation.includes(term.toLowerCase())
  );

  const total = mustMention.length + mustNotContain.length;
  const correct =
    mentioned.length + (mustNotContain.length - badTerms.length);
  const passed = missingTerms.length === 0 && badTerms.length === 0;

  const parts: string[] = [];
  if (mentioned.length > 0) parts.push(`Mentioned: ${mentioned.join(", ")}`);
  if (missingTerms.length > 0) parts.push(`Missing: ${missingTerms.join(", ")}`);
  if (badTerms.length > 0) parts.push(`Should not contain: ${badTerms.join(", ")}`);

  return {
    dimension: "explanation_content",
    score: correct,
    maxScore: total,
    passed,
    details: parts.join(". "),
  };
}

export function scoreWeightCoherence(
  result: AnalysisResult,
  evalCase: EvalCase
): RubricScore {
  const expectedOrder = evalCase.expectations.weightOrder;
  if (!expectedOrder || expectedOrder.length < 2) {
    return {
      dimension: "weight_coherence",
      score: 1,
      maxScore: 1,
      passed: true,
      details: "No weight order expectation set — skipped",
    };
  }

  const weightMap = new Map(
    result.dimensionBreakdown.map((d) => [d.dimension, d.weight])
  );

  let correctPairs = 0;
  let totalPairs = 0;
  const violations: string[] = [];

  for (let i = 0; i < expectedOrder.length - 1; i++) {
    for (let j = i + 1; j < expectedOrder.length; j++) {
      totalPairs++;
      const wA = weightMap.get(expectedOrder[i]) ?? 0;
      const wB = weightMap.get(expectedOrder[j]) ?? 0;
      if (wA >= wB) {
        correctPairs++;
      } else {
        violations.push(
          `${expectedOrder[i]} (${wA.toFixed(2)}) should outweigh ${expectedOrder[j]} (${wB.toFixed(2)})`
        );
      }
    }
  }

  const passed = violations.length === 0;

  return {
    dimension: "weight_coherence",
    score: correctPairs,
    maxScore: totalPairs,
    passed,
    details: passed
      ? `Weight ordering matches expected: ${expectedOrder.join(" > ")}`
      : `Violations: ${violations.join("; ")}`,
  };
}

export function scoreIntentAlignment(
  resultA: AnalysisResult,
  resultB: AnalysisResult,
  caseIdA: string,
  caseIdB: string
): RubricScore {
  const delta = Math.abs(resultA.parallaxScore - resultB.parallaxScore);
  const passed = delta >= 0.3;

  return {
    dimension: "intent_alignment",
    score: passed ? 1 : 0,
    maxScore: 1,
    passed,
    details: passed
      ? `Paired cases "${caseIdA}" (${resultA.parallaxScore}) and "${caseIdB}" (${resultB.parallaxScore}) diverge by ${delta.toFixed(1)} — intent produces different scores`
      : `Paired cases "${caseIdA}" (${resultA.parallaxScore}) and "${caseIdB}" (${resultB.parallaxScore}) only differ by ${delta.toFixed(1)} — system is not personalizing`,
  };
}

export function runAllRubrics(
  result: AnalysisResult,
  decomposed: DecomposedReview[],
  evalCase: EvalCase
): RubricScore[] {
  return [
    scoreConfidenceCalibration(result, decomposed, evalCase),
    scoreDimensionExtraction(decomposed, evalCase),
    scoreScoreRange(result, evalCase),
    scoreExplanationContent(result, evalCase),
    scoreWeightCoherence(result, evalCase),
  ];
}
