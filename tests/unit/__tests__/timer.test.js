// __tests__/timer.test.js — Unit tests for timer utility functions

const {
  TIMER_DURATION_OPTIONS,
  TIMER_DEFAULT_SECONDS,
  clampTimerValue,
  normalizeTimerDuration,
  ensureSessionTimer,
  getTimerRemainingSeconds,
} = require('../../../src/js/app-exports.js');

describe('Timer Utilities', () => {
  // ---- Constants ----------------------------------------

  describe('constants', () => {
    test('TIMER_DEFAULT_SECONDS is 30', () => {
      expect(TIMER_DEFAULT_SECONDS).toBe(30);
    });

    test('TIMER_DURATION_OPTIONS contains 30, 60, 90', () => {
      expect(TIMER_DURATION_OPTIONS).toEqual([30, 60, 90]);
    });
  });

  // ---- clampTimerValue -----------------------------------

  describe('clampTimerValue', () => {
    test('rounds a valid float to the nearest integer', () => {
      expect(clampTimerValue(29.7)).toBe(30);
      expect(clampTimerValue(29.2)).toBe(29);
    });

    test('returns 0 for zero', () => {
      expect(clampTimerValue(0)).toBe(0);
    });

    test('clamps negative numbers to 0', () => {
      expect(clampTimerValue(-5)).toBe(0);
    });

    test('returns fallback for NaN', () => {
      expect(clampTimerValue(NaN, 60)).toBe(60);
      expect(clampTimerValue(NaN)).toBe(TIMER_DEFAULT_SECONDS);
    });

    test('returns fallback for Infinity', () => {
      expect(clampTimerValue(Infinity, 90)).toBe(90);
    });

    test('returns fallback for undefined', () => {
      expect(clampTimerValue(undefined, 60)).toBe(60);
    });

    test('returns fallback for non-numeric strings', () => {
      expect(clampTimerValue('abc', 30)).toBe(30);
    });

    test('coerces null to 0 (Number(null) === 0)', () => {
      // null coerces to a valid 0 — not treated as missing; returns 0 not fallback
      expect(clampTimerValue(null, 30)).toBe(0);
    });

    test('coerces numeric strings', () => {
      expect(clampTimerValue('45', 30)).toBe(45);
    });

    test('uses TIMER_DEFAULT_SECONDS as default fallback', () => {
      expect(clampTimerValue('bad')).toBe(TIMER_DEFAULT_SECONDS);
    });
  });

  // ---- normalizeTimerDuration ----------------------------

  describe('normalizeTimerDuration', () => {
    test('returns 30 for 30', () => {
      expect(normalizeTimerDuration(30)).toBe(30);
    });

    test('returns 60 for 60', () => {
      expect(normalizeTimerDuration(60)).toBe(60);
    });

    test('returns 90 for 90', () => {
      expect(normalizeTimerDuration(90)).toBe(90);
    });

    test('defaults to TIMER_DEFAULT_SECONDS for unknown values', () => {
      expect(normalizeTimerDuration(45)).toBe(TIMER_DEFAULT_SECONDS);
      expect(normalizeTimerDuration(0)).toBe(TIMER_DEFAULT_SECONDS);
      expect(normalizeTimerDuration(-1)).toBe(TIMER_DEFAULT_SECONDS);
      expect(normalizeTimerDuration(NaN)).toBe(TIMER_DEFAULT_SECONDS);
      expect(normalizeTimerDuration(null)).toBe(TIMER_DEFAULT_SECONDS);
      expect(normalizeTimerDuration('abc')).toBe(TIMER_DEFAULT_SECONDS);
    });

    test('coerces numeric string inputs', () => {
      expect(normalizeTimerDuration('60')).toBe(60);
      expect(normalizeTimerDuration('90')).toBe(90);
    });
  });

  // ---- ensureSessionTimer --------------------------------

  describe('ensureSessionTimer', () => {
    test('creates a default timer on a session with no timer', () => {
      const session = {};
      const timer = ensureSessionTimer(session);

      expect(timer.durationSec).toBe(TIMER_DEFAULT_SECONDS);
      expect(timer.remainingSec).toBe(TIMER_DEFAULT_SECONDS);
      expect(timer.isRunning).toBe(false);
      expect(timer.endsAt).toBeNull();
    });

    test('mutates session.timer in place', () => {
      const session = {};
      const timer = ensureSessionTimer(session);
      expect(session.timer).toBe(timer);
    });

    test('repairs out-of-range durationSec to default', () => {
      const session = { timer: { durationSec: 45, remainingSec: 45, isRunning: false, endsAt: null } };
      const timer = ensureSessionTimer(session);
      expect(timer.durationSec).toBe(TIMER_DEFAULT_SECONDS);
    });

    test('repairs negative remainingSec to 0', () => {
      const session = { timer: { durationSec: 30, remainingSec: -5, isRunning: false, endsAt: null } };
      const timer = ensureSessionTimer(session);
      expect(timer.remainingSec).toBe(0);
    });

    test('coerces isRunning to boolean', () => {
      const session = { timer: { durationSec: 60, remainingSec: 60, isRunning: 1, endsAt: null } };
      const timer = ensureSessionTimer(session);
      expect(typeof timer.isRunning).toBe('boolean');
      expect(timer.isRunning).toBe(true);
    });

    test('sets endsAt to null when not running', () => {
      const session = {
        timer: { durationSec: 30, remainingSec: 20, isRunning: false, endsAt: Date.now() + 20000 },
      };
      const timer = ensureSessionTimer(session);
      expect(timer.endsAt).toBeNull();
    });

    test('preserves valid endsAt when running', () => {
      const futureEndsAt = Date.now() + 25000;
      const session = {
        timer: { durationSec: 30, remainingSec: 25, isRunning: true, endsAt: futureEndsAt },
      };
      const timer = ensureSessionTimer(session);
      expect(timer.isRunning).toBe(true);
      expect(timer.endsAt).toBe(futureEndsAt);
    });

    test('fills missing endsAt when running', () => {
      const before = Date.now();
      const session = {
        timer: { durationSec: 30, remainingSec: 20, isRunning: true, endsAt: null },
      };
      const timer = ensureSessionTimer(session);
      const after = Date.now();

      expect(timer.isRunning).toBe(true);
      expect(timer.endsAt).toBeGreaterThanOrEqual(before + 20000);
      expect(timer.endsAt).toBeLessThanOrEqual(after + 20000);
    });

    test('returns default object for null session (no mutation)', () => {
      const timer = ensureSessionTimer(null);
      expect(timer.durationSec).toBe(TIMER_DEFAULT_SECONDS);
      expect(timer.isRunning).toBe(false);
    });
  });

  // ---- getTimerRemainingSeconds ---------------------------

  describe('getTimerRemainingSeconds', () => {
    test('returns TIMER_DEFAULT_SECONDS for null timer', () => {
      expect(getTimerRemainingSeconds(null)).toBe(TIMER_DEFAULT_SECONDS);
    });

    test('returns remainingSec when timer is stopped', () => {
      const timer = { durationSec: 60, remainingSec: 45, isRunning: false, endsAt: null };
      expect(getTimerRemainingSeconds(timer)).toBe(45);
    });

    test('returns 0 when stopped with 0 remainingSec', () => {
      const timer = { durationSec: 30, remainingSec: 0, isRunning: false, endsAt: null };
      expect(getTimerRemainingSeconds(timer)).toBe(0);
    });

    test('derives remaining from endsAt when running', () => {
      const nowMs = 1000000;
      const timer = {
        durationSec: 30,
        remainingSec: 30,
        isRunning: true,
        endsAt: nowMs + 15000, // 15 seconds left
      };
      expect(getTimerRemainingSeconds(timer, nowMs)).toBe(15);
    });

    test('returns 0 when timer has passed endsAt', () => {
      const nowMs = 1000000;
      const timer = {
        durationSec: 30,
        remainingSec: 30,
        isRunning: true,
        endsAt: nowMs - 1000, // 1 second past expiry
      };
      expect(getTimerRemainingSeconds(timer, nowMs)).toBe(0);
    });

    test('returns 0 exactly at expiry boundary', () => {
      const nowMs = 1000000;
      const timer = {
        durationSec: 30,
        remainingSec: 30,
        isRunning: true,
        endsAt: nowMs, // exactly expired
      };
      expect(getTimerRemainingSeconds(timer, nowMs)).toBe(0);
    });

    test('rounds up partial seconds (ceiling)', () => {
      const nowMs = 1000000;
      const timer = {
        durationSec: 30,
        remainingSec: 30,
        isRunning: true,
        endsAt: nowMs + 14001, // 14.001s left → rounds up to 15
      };
      expect(getTimerRemainingSeconds(timer, nowMs)).toBe(15);
    });

    test('is not affected by stale remainingSec when running', () => {
      const nowMs = 1000000;
      const timer = {
        durationSec: 30,
        remainingSec: 99, // stale/wrong snapshot — should be ignored
        isRunning: true,
        endsAt: nowMs + 10000,
      };
      // Should derive 10s from endsAt, not use remainingSec=99
      expect(getTimerRemainingSeconds(timer, nowMs)).toBe(10);
    });

    test('injectable nowMs allows deterministic testing', () => {
      const fixedNow = 5000000;
      const timer = {
        durationSec: 60,
        remainingSec: 60,
        isRunning: true,
        endsAt: fixedNow + 7000,
      };
      expect(getTimerRemainingSeconds(timer, fixedNow)).toBe(7);
      expect(getTimerRemainingSeconds(timer, fixedNow + 2000)).toBe(5);
    });
  });
});
