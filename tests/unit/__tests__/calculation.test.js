// __tests__/calculation.test.js - Unit tests for calculation functions

const { calculateSP, mapToFibonacci } = require('../../../src/js/app-exports.js');

describe('Story Point Calculation', () => {
  describe('calculateSP', () => {
    test('calculates with base size 1 and no multipliers', () => {
      const result = calculateSP(1, 1, 1, 1, 1, 1);
      expect(result.rawScore).toBe(1);
      expect(result.roundedScore).toBe(1);
      expect(result.sp).toBe(1);
    });

    test('calculates with size 5 and no multipliers', () => {
      const result = calculateSP(5, 1, 1, 1, 1, 1);
      expect(result.rawScore).toBe(5);
      expect(result.roundedScore).toBe(5);
      expect(result.sp).toBe(5);
    });

    test('applies complexity multiplier', () => {
      const result = calculateSP(1, 2, 1, 1, 1, 1);
      expect(result.rawScore).toBe(1.05);
      expect(result.multipliers.complexity).toBe(1.05);
    });

    test('applies all multipliers correctly', () => {
      const result = calculateSP(5, 2, 2, 2, 2, 2);
      const expected = 5 * 1.05 * 1.05 * 1.05 * 1.05 * 1.05;
      expect(result.rawScore).toBeCloseTo(expected, 5);
    });

    test('maps raw score to Fibonacci by range', () => {
      const result = calculateSP(10, 1, 1, 1, 1, 1);
      expect(result.sp).toBe(13);
    });

    test('handles edge case of size 0', () => {
      const result = calculateSP(0, 1, 1, 1, 1, 1);
      expect(result.rawScore).toBe(0);
    });

    test('handles maximum multipliers', () => {
      const result = calculateSP(13, 3, 3, 3, 3, 3);
      const expected = 13 * 1.1 * 1.1 * 1.1 * 1.1 * 1.1;
      expect(result.rawScore).toBeCloseTo(expected, 5);
      expect(result.sp).toBeGreaterThan(0);
    });

    test('returns correct multiplier breakdown', () => {
      const result = calculateSP(3, 3, 2, 2, 1, 3);
      expect(result.multipliers.complexity).toBe(1.1);
      expect(result.multipliers.uncertainty).toBe(1.05);
      expect(result.multipliers.cognitive).toBe(1.05);
      expect(result.multipliers.deps).toBe(1);
      expect(result.multipliers.risk).toBe(1.1);
    });

    test('rawScore matches calculation', () => {
      const size = 8;
      const complexity = 3;
      const uncertainty = 2;
      const cognitive = 3;
      const deps = 1;
      const risk = 2;

      const result = calculateSP(size, complexity, uncertainty, cognitive, deps, risk);
      const manualCalc = size * 1.1 * 1.05 * 1.1 * 1 * 1.05;
      expect(result.rawScore).toBeCloseTo(manualCalc, 5);
    });

    test('roundedScore is integer', () => {
      const result = calculateSP(5, 2, 3, 1, 2, 3);
      expect(Number.isInteger(result.roundedScore)).toBe(true);
    });

    test('sp is in Fibonacci sequence', () => {
      const result = calculateSP(21, 3, 3, 3, 3, 3);
      const fib = [1, 2, 3, 5, 8, 13];
      expect(fib).toContain(result.sp);
    });
  });
});
