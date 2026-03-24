// __tests__/utils.test.js - Unit tests for utility functions

const {
  FIBONACCI_CARDS,
  mapToFibonacci,
  scoreToMultiplier,
  formatCalcNumber,
  voteColorClass,
  nearestFib,
  deepClone,
  getAblyErrorCode,
  getAblyChannelName,
  safeText,
} = require('../../../src/js/app-exports.js');

describe('Utility Functions', () => {
  describe('mapToFibonacci', () => {
    test('maps 1 to 1', () => {
      expect(mapToFibonacci(1)).toBe(1);
    });

    test('maps 2 to 2', () => {
      expect(mapToFibonacci(2)).toBe(2);
    });

    test('maps 4 to 3 or 5 (closest)', () => {
      const result = mapToFibonacci(4);
      expect([3, 5]).toContain(result);
    });

    test('maps 15 to 13', () => {
      expect(mapToFibonacci(15)).toBe(13);
    });

    test('maps 0 to 1', () => {
      expect(mapToFibonacci(0)).toBe(1);
    });

    test('handles large numbers', () => {
      const result = mapToFibonacci(100);
      expect(result).toBe(13); // 13 is max in fibs array
    });
  });

  describe('scoreToMultiplier', () => {
    test('score 1 returns 1', () => {
      expect(scoreToMultiplier(1)).toBe(1);
    });

    test('score 2 returns 1.05', () => {
      expect(scoreToMultiplier(2)).toBe(1.05);
    });

    test('score 3 returns 1.1', () => {
      expect(scoreToMultiplier(3)).toBe(1.1);
    });

    test('score above 3 defaults to 1', () => {
      expect(scoreToMultiplier(4)).toBe(1);
      expect(scoreToMultiplier(5)).toBe(1);
    });

    test('unknown score returns 1', () => {
      expect(scoreToMultiplier(99)).toBe(1);
    });

    test('returns 1 for 0', () => {
      expect(scoreToMultiplier(0)).toBe(1);
    });
  });

  describe('formatCalcNumber', () => {
    test('returns string for integers', () => {
      expect(formatCalcNumber(5)).toBe('5');
      expect(formatCalcNumber(0)).toBe('0');
    });

    test('formats decimals to 2 places', () => {
      expect(formatCalcNumber(5.1234)).toBe('5.12');
    });

    test('removes trailing zeros', () => {
      expect(formatCalcNumber(5.1)).toBe('5.1');
      expect(formatCalcNumber(5.0)).toBe('5');
    });

    test('handles negative numbers', () => {
      expect(formatCalcNumber(-5.5)).toBe('-5.5');
    });

    test('handles very small decimals', () => {
      expect(formatCalcNumber(0.001)).toBe('0');
    });
  });

  describe('voteColorClass', () => {
    test('returns empty for non-numeric votes', () => {
      expect(voteColorClass('?')).toBe('');
      expect(voteColorClass('☕')).toBe('');
    });

    test('returns vote-low for 0-3', () => {
      expect(voteColorClass('0')).toBe('vote-low');
      expect(voteColorClass('1')).toBe('vote-low');
      expect(voteColorClass('3')).toBe('vote-low');
    });

    test('returns vote-ok for 4-8', () => {
      expect(voteColorClass('5')).toBe('vote-ok');
      expect(voteColorClass('8')).toBe('vote-ok');
    });

    test('returns vote-med for 9-21', () => {
      expect(voteColorClass('13')).toBe('vote-med');
      expect(voteColorClass('21')).toBe('vote-med');
    });

    test('returns vote-high for 22+', () => {
      expect(voteColorClass('34')).toBe('vote-high');
      expect(voteColorClass('89')).toBe('vote-high');
    });

    test('handles numeric inputs', () => {
      expect(voteColorClass(5)).toBe('vote-ok');
      expect(voteColorClass(3)).toBe('vote-low');
    });
  });

  describe('nearestFib', () => {
    test('returns 0 for 0', () => {
      expect(nearestFib(0)).toBe(0);
    });

    test('returns 1 for 1', () => {
      expect(nearestFib(1)).toBe(1);
    });

    test('returns nearest for 4', () => {
      expect(nearestFib(4)).toBe(3);
    });

    test('returns nearest for 6', () => {
      expect(nearestFib(6)).toBe(5);
    });

    test('returns 89 for 100', () => {
      expect(nearestFib(100)).toBe(89);
    });

    test('handles decimals', () => {
      const result = nearestFib(4.5);
      expect([3, 5]).toContain(result);
    });
  });

  describe('deepClone', () => {
    test('clones simple objects', () => {
      const obj = { a: 1, b: 2 };
      const clone = deepClone(obj);
      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj);
    });

    test('clones nested objects', () => {
      const obj = { a: { b: { c: 3 } } };
      const clone = deepClone(obj);
      expect(clone).toEqual(obj);
      expect(clone.a).not.toBe(obj.a);
    });

    test('clones arrays', () => {
      const arr = [1, 2, { a: 3 }];
      const clone = deepClone(arr);
      expect(clone).toEqual(arr);
      expect(clone).not.toBe(arr);
      expect(clone[2]).not.toBe(arr[2]);
    });

    test('handles null', () => {
      expect(deepClone(null)).toBe(null);
    });

    test('handles primitives', () => {
      expect(deepClone(5)).toBe(5);
      expect(deepClone('string')).toBe('string');
    });
  });

  describe('getAblyErrorCode', () => {
    test('extracts code from error.code', () => {
      expect(getAblyErrorCode({ code: 40160 })).toBe(40160);
    });

    test('extracts code from error.response.error.code', () => {
      expect(getAblyErrorCode({ response: { error: { code: 50000 } } })).toBe(50000);
    });

    test('extracts code from error.statusCode', () => {
      expect(getAblyErrorCode({ statusCode: 401 })).toBe(401);
    });

    test('returns 0 for unknown error', () => {
      expect(getAblyErrorCode({})).toBe(0);
    });

    test('returns 0 for null', () => {
      expect(getAblyErrorCode(null)).toBe(0);
    });

    test('handles string codes', () => {
      expect(getAblyErrorCode({ code: '40160' })).toBe(40160);
    });
  });

  describe('getAblyChannelName', () => {
    test('generates channel name with session ID', () => {
      expect(getAblyChannelName('ABC123')).toBe('avb-poker:session:ABC123');
    });

    test('handles empty session ID', () => {
      expect(getAblyChannelName('')).toBe('avb-poker:session:');
    });

    test('handles special characters', () => {
      expect(getAblyChannelName('ABC-123_xyz')).toBe('avb-poker:session:ABC-123_xyz');
    });
  });

  describe('safeText', () => {
    test('returns empty string for null', () => {
      expect(safeText(null)).toBe('');
    });

    test('returns empty string for undefined', () => {
      expect(safeText(undefined)).toBe('');
    });

    test('trims whitespace', () => {
      expect(safeText('  hello  ')).toBe('hello');
    });

    test('truncates to 80 characters', () => {
      const long = 'a'.repeat(100);
      expect(safeText(long).length).toBe(80);
    });

    test('converts to string', () => {
      expect(safeText(123)).toBe('123');
    });

    test('handles mixed input', () => {
      expect(safeText('  Test String  ')).toBe('Test String');
    });
  });

  describe('FIBONACCI_CARDS constant', () => {
    test('contains expected cards', () => {
      expect(FIBONACCI_CARDS).toContain('0');
      expect(FIBONACCI_CARDS).toContain('5');
      expect(FIBONACCI_CARDS).toContain('?');
      expect(FIBONACCI_CARDS).toContain('☕');
    });

    test('has 13 cards', () => {
      expect(FIBONACCI_CARDS.length).toBe(13);
    });
  });
});
