// app-exports.js - Exportable functions from app.js for testing
// This file re-exports main functions to make them testable

'use strict';

// These will be populated when app.js loads
const FIBONACCI_CARDS = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];

// Rounded score -> Suggested SP mapping
function mapToFibonacci(roundedScore) {
  const fibs = [1, 2, 3, 5, 8, 13];
  return fibs.reduce((prev, curr) => (Math.abs(curr - roundedScore) < Math.abs(prev - roundedScore) ? curr : prev));
}

function scoreToMultiplier(score) {
  const multiplierMap = {
    1: 1,
    2: 1.025,
    3: 1.05,
    4: 1.075,
    5: 1.1,
  };
  return multiplierMap[score] || 1;
}

function formatCalcNumber(value) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function voteColorClass(vote) {
  const v = parseFloat(vote);
  if (isNaN(v)) return '';
  if (v <= 3) return 'vote-low';
  if (v <= 8) return 'vote-ok';
  if (v <= 21) return 'vote-med';
  return 'vote-high';
}

function nearestFib(avg) {
  const fibs = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
  return fibs.reduce((prev, curr) => (Math.abs(curr - avg) < Math.abs(prev - avg) ? curr : prev));
}

// Utility functions
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getAblyErrorCode(err) {
  return Number(err?.code || err?.response?.error?.code || err?.statusCode || 0);
}

function getAblyChannelName(sessionId) {
  const prefix = 'avb-poker';
  return `${prefix}:session:${sessionId}`;
}

function safeText(val) {
  if (!val) return '';
  return String(val).trim().slice(0, 80);
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
  const sp = mapToFibonacci(roundedScore);
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

function generateSessionId() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let id = '';
  const arr = crypto.getRandomValues(new Uint8Array(8));
  arr.forEach((b) => {
    id += alphabet[b % alphabet.length];
  });
  return id;
}

function isRoomExpired(session) {
  return !!(session && session.expiresAt && Date.now() > Number(session.expiresAt));
}

// Exports for testing
module.exports = {
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
  calculateSP,
  generateSessionId,
  isRoomExpired,
};
