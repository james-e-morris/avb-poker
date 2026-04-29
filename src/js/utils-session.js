/**
 * Session Utilities
 * Pure functions for timer logic, session state validation, and vote summarization.
 *
 * Loading model:
 *  - Browser:  NOT loaded as a <script> tag. The browser app (app.js) contains
 *              equivalent implementations inline. These definitions are the
 *              canonical reference; app.js must stay in sync with them.
 *  - Node/Jest: Required by app-exports.js, which re-exports them for unit tests.
 *
 * Dependencies: utils-calculations.js (nearestFib), utils-string.js (formatCalcNumber).
 */

'use strict';

const { nearestFib } = require('./utils-calculations.js');
const { formatCalcNumber } = require('./utils-string.js');

// ---- Timer constants ----------------------------------------

const TIMER_DURATION_OPTIONS = [30, 60, 90];
const TIMER_DEFAULT_SECONDS = 30;

// ---- Timer utilities ----------------------------------------

/**
 * Clamp a raw value to a valid non-negative integer.
 * Returns `fallback` when the value is not a finite number.
 */
function clampTimerValue(value, fallback = TIMER_DEFAULT_SECONDS) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.round(numeric));
}

/**
 * Normalize to one of the allowed timer durations [30, 60, 90].
 * Any other value falls back to TIMER_DEFAULT_SECONDS.
 */
function normalizeTimerDuration(value) {
  const numeric = Number(value);
  return TIMER_DURATION_OPTIONS.includes(numeric) ? numeric : TIMER_DEFAULT_SECONDS;
}

/**
 * Ensure session.timer is a fully valid timer object, repairing any missing
 * or out-of-range fields. Mutates session.timer in place and returns it.
 * When session is null/invalid, returns a fresh default timer (no mutation).
 */
function ensureSessionTimer(session) {
  const defaults = {
    durationSec: TIMER_DEFAULT_SECONDS,
    remainingSec: TIMER_DEFAULT_SECONDS,
    isRunning: false,
    endsAt: null,
  };

  if (!session || typeof session !== 'object') return defaults;

  const existing = session.timer || {};
  const durationSec = normalizeTimerDuration(existing.durationSec);
  const remainingSec = clampTimerValue(existing.remainingSec, durationSec);
  const isRunning = !!existing.isRunning;
  const endsAt = isRunning ? Number(existing.endsAt) || Date.now() + remainingSec * 1000 : null;

  session.timer = { durationSec, remainingSec, isRunning, endsAt };
  return session.timer;
}

/**
 * Compute remaining seconds for a timer.
 *
 * When running, derives the count from `endsAt` (an absolute server timestamp)
 * so all clients converge to the same value regardless of when they last
 * received state. Modern NTP-synced devices are accurate to within tens of
 * milliseconds — no manual offset correction is needed.
 *
 * When stopped, returns remainingSec from the stored snapshot.
 *
 * @param {object|null} timer - Timer object from session state.
 * @param {number} [nowMs] - Current epoch ms; injectable for testing.
 * @returns {number} Remaining whole seconds, clamped to [0, durationSec].
 */
function getTimerRemainingSeconds(timer, nowMs = Date.now()) {
  if (!timer) return TIMER_DEFAULT_SECONDS;

  if (timer.isRunning && timer.endsAt) {
    const remainingMs = Number(timer.endsAt) - nowMs;
    if (remainingMs <= 0) return 0;
    return clampTimerValue(Math.ceil(remainingMs / 1000), timer.durationSec);
  }

  return clampTimerValue(timer.remainingSec, timer.durationSec);
}

// ---- Session state helpers ----------------------------------

/**
 * Return true when the session has a committed final decision.
 */
function hasFinalDecision(session) {
  return !!(session && session.finalDecision !== null && session.finalDecision !== undefined);
}

/**
 * Return true when it is valid to start the next story.
 * Outside of revealed state the check is always satisfied; inside revealed
 * state a final decision is required first.
 */
function canStartNextStory(session) {
  if (!session || session.status !== 'revealed') return true;
  return hasFinalDecision(session);
}

// ---- Vote summary -------------------------------------------

/**
 * Summarize numeric votes for a participants map.
 *
 * @param {object} participants - Map of userId → participant objects.
 * @returns {{ entries, avg, isConsensus, distinctNumericVotes, nearest }}
 */
function summarizeVotes(participants) {
  const entries = Object.entries(participants || {}).sort(([, a], [, b]) => (a.joinedAt || 0) - (b.joinedAt || 0));
  const numericVotes = entries.map(([, p]) => parseFloat(p.vote)).filter((v) => !isNaN(v));
  const avg = numericVotes.length ? numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length : null;
  const distinctNumericVotes = numericVotes.length ? new Set(numericVotes).size : 0;
  const isConsensus = numericVotes.length > 0 && distinctNumericVotes === 1;

  return {
    entries,
    avg,
    isConsensus,
    distinctNumericVotes,
    nearest: avg !== null ? nearestFib(avg) : null,
  };
}

/**
 * Derive a consensus final decision value from participants' votes.
 * Returns the formatted numeric string when all numeric voters agree, else null.
 *
 * @param {object} participants - Map of userId → participant objects.
 * @returns {string|null}
 */
function getConsensusFinalDecision(participants) {
  const summary = summarizeVotes(participants || {});
  if (!summary.isConsensus || summary.distinctNumericVotes === 0) return null;
  const numericVote = summary.entries.map(([, p]) => parseFloat(p.vote)).find((v) => !isNaN(v));
  if (numericVote === undefined) return null;
  return formatCalcNumber(numericVote);
}

// ---- Exports ------------------------------------------------

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TIMER_DURATION_OPTIONS,
    TIMER_DEFAULT_SECONDS,
    clampTimerValue,
    normalizeTimerDuration,
    ensureSessionTimer,
    getTimerRemainingSeconds,
    hasFinalDecision,
    canStartNextStory,
    summarizeVotes,
    getConsensusFinalDecision,
  };
}
