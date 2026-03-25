// app-exports.js - Exportable functions from app.js for testing
// This file re-exports main functions to make them testable

'use strict';

const TEST_FIBONACCI_CARDS = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];

// Raw score -> Suggested SP mapping (range-based)
function mapToFibonacci(rawScore) {
  if (rawScore < 1.1) return 1;
  if (rawScore < 2.1) return 2;
  if (rawScore < 4) return 3;
  if (rawScore < 6) return 5;
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
  if (avg < 1.1) return 1;
  if (avg < 2.1) return 2;
  if (avg < 4) return 3;
  if (avg < 6) return 5;
  if (avg < 10) return 8;
  if (avg < 17) return 13;
  if (avg < 27) return 21;
  if (avg < 44) return 34;
  if (avg < 72) return 55;
  return 89;
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

function formatAdminStatus(record) {
  const hasFinal =
    record?.finalDecision !== null && record?.finalDecision !== undefined && record?.finalDecision !== '';
  return hasFinal ? `${record.finalDecision} SP` : 'voting';
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

// ---- Jira Prompt Parsing -----------------------------------

function parseJiraPromptResponse(text) {
  const levelToValue = { low: 1, medium: 2, high: 3 };
  const sizeValues = [1, 2, 3, 5, 8];

  const lines = text.split(/\r?\n/);

  const get = (label) => {
    const match = text.match(new RegExp(`^${label}\\s*:\\s*(.+)$`, 'im'));
    return match ? match[1].trim() : null;
  };

  const getReason = (label) => {
    const labelRegex = new RegExp(`^${label}\\s*:`, 'i');
    for (let i = 0; i < lines.length - 1; i++) {
      if (labelRegex.test(lines[i].trim())) {
        const reasonMatch = lines[i + 1].match(/^\s*-\s+(.+)$/);
        return reasonMatch ? reasonMatch[1].trim() : null;
      }
    }
    return null;
  };

  const rawSize = get('Size');
  const rawComplexity = get('Complexity');
  const rawUncertainty = get('Uncertainty');
  const rawCognitive = get('Cognitive Load');
  const rawDeps = get('Dependencies');
  const rawRisk = get('Risk');

  if (!rawSize || !rawComplexity || !rawUncertainty || !rawCognitive || !rawDeps || !rawRisk) return null;

  const sizeNum = parseInt(rawSize, 10);
  const size = sizeValues.includes(sizeNum) ? sizeNum : null;
  const complexity = levelToValue[rawComplexity.toLowerCase()];
  const uncertainty = levelToValue[rawUncertainty.toLowerCase()];
  const cognitive = levelToValue[rawCognitive.toLowerCase()];
  const deps = levelToValue[rawDeps.toLowerCase()];
  const risk = levelToValue[rawRisk.toLowerCase()];

  if (!size || !complexity || !uncertainty || !cognitive || !deps || !risk) return null;

  const sizeReason = getReason('Size');
  const complexityReason = complexity > 1 ? getReason('Complexity') : null;
  const uncertaintyReason = uncertainty > 1 ? getReason('Uncertainty') : null;
  const cognitiveReason = cognitive > 1 ? getReason('Cognitive Load') : null;
  const depsReason = deps > 1 ? getReason('Dependencies') : null;
  const riskReason = risk > 1 ? getReason('Risk') : null;
  const spReason = getReason('Suggested Story Points');

  return {
    size,
    sizeReason,
    complexity,
    complexityReason,
    uncertainty,
    uncertaintyReason,
    cognitive,
    cognitiveReason,
    deps,
    depsReason,
    risk,
    riskReason,
    spReason,
  };
}

// ---- Jira Prompt Sidebar ------------------------------------

function setJiraPromptSidebarExpanded(expanded) {
  const gameView = document.getElementById('view-game');
  const sidebar = document.getElementById('jira-prompt-sidebar');
  const openBtn = document.getElementById('btn-toggle-jira-prompt-float');
  if (!gameView || !sidebar || !openBtn) return;

  gameView.classList.toggle('jira-prompt-open', !!expanded);
  sidebar.classList.toggle('is-collapsed', !expanded);
  openBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  openBtn.hidden = !!expanded;
}

function toggleJiraPromptSidebar() {
  const gameView = document.getElementById('view-game');
  if (!gameView) return;
  setJiraPromptSidebarExpanded(!gameView.classList.contains('jira-prompt-open'));
}

// Exports for testing (Node/Jest only)
module.exports = {
  FIBONACCI_CARDS: TEST_FIBONACCI_CARDS,
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
  calculateSP,
  generateSessionId,
  isRoomExpired,
  parseJiraPromptResponse,
  setJiraPromptSidebarExpanded,
  toggleJiraPromptSidebar,
};
