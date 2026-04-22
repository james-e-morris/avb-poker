/**
 * Calculation Utilities
 * Core math functions for story point estimation
 */

'use strict';

const FIBONACCI_CARDS = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];

function mapToFibonacci(rawScore) {
  if (rawScore < 1.4) return 1;
  if (rawScore < 2.5) return 2;
  if (rawScore < 3.9) return 3;
  if (rawScore < 6.5) return 5;
  if (rawScore < 10) return 8;
  if (rawScore < 17) return 13;
  if (rawScore < 27) return 21;
  if (rawScore < 44) return 34;
  if (rawScore < 72) return 55;
  return 89;
}

function scoreToMultiplier(score) {
  const multiplierMap = {
    1: 1,
    2: 1.1,
    3: 1.2,
  };
  return multiplierMap[score] || 1;
}

function nearestFib(avg) {
  if (avg < 1.4) return 1;
  if (avg < 2.5) return 2;
  if (avg < 3.9) return 3;
  if (avg < 6.5) return 5;
  if (avg < 10) return 8;
  if (avg < 17) return 13;
  if (avg < 27) return 21;
  if (avg < 44) return 34;
  if (avg < 72) return 55;
  return 89;
}

function calculateSP(size, c, u, cl, d, r) {
  const complexityMultiplier = scoreToMultiplier(c);
  const uncertaintyMultiplier = scoreToMultiplier(u);
  const cognitiveMultiplier = scoreToMultiplier(cl);
  const dependencyMultiplier = scoreToMultiplier(d);
  const riskMultiplier = scoreToMultiplier(r);

  const total =
    size * complexityMultiplier * uncertaintyMultiplier * cognitiveMultiplier * dependencyMultiplier * riskMultiplier;

  const roundedScore = Math.round(total);
  const sp = mapToFibonacci(total);
  return {
    rawScore: total,
    roundedScore,
    sp,
    multipliers: {
      complexity: complexityMultiplier,
      uncertainty: uncertaintyMultiplier,
      cognitive: cognitiveMultiplier,
      deps: dependencyMultiplier,
      risk: riskMultiplier,
    },
  };
}

// Exports for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FIBONACCI_CARDS,
    mapToFibonacci,
    scoreToMultiplier,
    nearestFib,
    calculateSP,
  };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.FIBONACCI_CARDS = FIBONACCI_CARDS;
  window.mapToFibonacci = mapToFibonacci;
  window.scoreToMultiplier = scoreToMultiplier;
  window.nearestFib = nearestFib;
  window.calculateSP = calculateSP;
}
