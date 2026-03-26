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
  formatAdminStatus,
} = require('../../../src/js/app-exports.js');

describe('Utility Functions', () => {
  describe('mapToFibonacci', () => {
    test('maps values in each bucket', () => {
      expect(mapToFibonacci(0)).toBe(1);
      expect(mapToFibonacci(1.49)).toBe(1);
      expect(mapToFibonacci(1.5)).toBe(2);
      expect(mapToFibonacci(3.9)).toBe(3);
      expect(mapToFibonacci(6.4)).toBe(5);
      expect(mapToFibonacci(9.9)).toBe(8);
      expect(mapToFibonacci(16.9)).toBe(13);
      expect(mapToFibonacci(26.9)).toBe(21);
      expect(mapToFibonacci(43.9)).toBe(34);
      expect(mapToFibonacci(71.9)).toBe(55);
      expect(mapToFibonacci(100)).toBe(89);
    });

    test('maps threshold boundaries to the next bucket', () => {
      expect(mapToFibonacci(1.5)).toBe(2);
      expect(mapToFibonacci(2.5)).toBe(3);
      expect(mapToFibonacci(4)).toBe(5);
      expect(mapToFibonacci(6.5)).toBe(8);
      expect(mapToFibonacci(10)).toBe(13);
      expect(mapToFibonacci(17)).toBe(21);
      expect(mapToFibonacci(27)).toBe(34);
      expect(mapToFibonacci(44)).toBe(55);
      expect(mapToFibonacci(72)).toBe(89);
    });
  });

  describe('scoreToMultiplier', () => {
    test('score 1 returns 1', () => {
      expect(scoreToMultiplier(1)).toBe(1);
    });

    test('score 2 returns 1.1', () => {
      expect(scoreToMultiplier(2)).toBe(1.1);
    });

    test('score 3 returns 1.2', () => {
      expect(scoreToMultiplier(3)).toBe(1.2);
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
    test('returns mapped value across buckets', () => {
      expect(nearestFib(0)).toBe(1);
      expect(nearestFib(1)).toBe(1);
      expect(nearestFib(1.49)).toBe(1);
      expect(nearestFib(2)).toBe(2);
      expect(nearestFib(4)).toBe(5);
      expect(nearestFib(6)).toBe(5);
      expect(nearestFib(12)).toBe(13);
      expect(nearestFib(19)).toBe(21);
      expect(nearestFib(34)).toBe(34);
      expect(nearestFib(70)).toBe(55);
      expect(nearestFib(100)).toBe(89);
    });

    test('handles decimal boundary transitions', () => {
      expect(nearestFib(1.5)).toBe(2);
      expect(nearestFib(2.5)).toBe(3);
      expect(nearestFib(3.99)).toBe(3);
      expect(nearestFib(4.5)).toBe(5);
      expect(nearestFib(6.49)).toBe(5);
      expect(nearestFib(6.5)).toBe(8);
      expect(nearestFib(16.99)).toBe(13);
      expect(nearestFib(17.01)).toBe(21);
      expect(nearestFib(44.01)).toBe(55);
      expect(nearestFib(72.01)).toBe(89);
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

  describe('formatAdminStatus', () => {
    test('returns voting when finalDecision is null', () => {
      expect(formatAdminStatus({ finalDecision: null })).toBe('voting');
    });

    test('returns voting when finalDecision is undefined', () => {
      expect(formatAdminStatus({})).toBe('voting');
    });

    test('returns voting when finalDecision is empty string', () => {
      expect(formatAdminStatus({ finalDecision: '' })).toBe('voting');
    });

    test('returns formatted SP label when finalDecision exists', () => {
      expect(formatAdminStatus({ finalDecision: 8 })).toBe('8 SP');
      expect(formatAdminStatus({ finalDecision: '13' })).toBe('13 SP');
    });
  });
});
