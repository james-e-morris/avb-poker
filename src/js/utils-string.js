/**
 * String & Text Utilities
 * Formatting, validation, and text manipulation helpers
 */

'use strict';

function formatCalcNumber(value) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function safeText(val) {
  if (!val) return '';
  return String(val).trim().slice(0, 80);
}

function voteColorClass(vote) {
  const v = parseFloat(vote);
  if (isNaN(v)) return '';
  if (v <= 3) return 'vote-low';
  if (v <= 8) return 'vote-ok';
  if (v <= 21) return 'vote-med';
  return 'vote-high';
}

function formatAdminStatus(record) {
  const hasFinal =
    record?.finalDecision !== null && record?.finalDecision !== undefined && record?.finalDecision !== '';
  return hasFinal ? `${record.finalDecision} SP` : 'voting';
}

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

// Exports for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatCalcNumber,
    safeText,
    voteColorClass,
    formatAdminStatus,
    deepClone,
    getAblyErrorCode,
    getAblyChannelName,
  };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.formatCalcNumber = formatCalcNumber;
  window.safeText = safeText;
  window.voteColorClass = voteColorClass;
  window.formatAdminStatus = formatAdminStatus;
  window.deepClone = deepClone;
  window.getAblyErrorCode = getAblyErrorCode;
  window.getAblyChannelName = getAblyChannelName;
}
