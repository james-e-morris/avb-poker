// app-exports.js - Exportable functions for testing
// Re-exports from modular utility files to eliminate duplication

'use strict';

// Import utilities - in Node.js/Jest, these come from utility modules
// In the browser, they're loaded as global scripts and functions exist globally
const {
  FIBONACCI_CARDS,
  mapToFibonacci,
  scoreToMultiplier,
  nearestFib,
  calculateSP,
} = require('./utils-calculations.js');

const {
  formatCalcNumber,
  safeText,
  voteColorClass,
  formatAdminStatus,
  deepClone,
  getAblyErrorCode,
  getAblyChannelName,
} = require('./utils-string.js');

const { getRevealDisabledReason, getNextStoryDisabledReason } = require('./utils-validation.js');

function getParticipantRankingSummary(participant) {
  const rankingSources = [
    participant?.rankings,
    participant?.ranking,
    participant?.voteRanking,
    participant?.voteRankings,
    participant?.voteMeta?.ranking,
    participant?.voteMeta?.rankings,
  ];

  const ranking = rankingSources.find(
    (candidate) => candidate && typeof candidate === 'object' && !Array.isArray(candidate)
  );
  if (!ranking) return '';

  const sizeVal = ranking.size !== null && ranking.size !== undefined ? String(ranking.size) : null;

  const cogVal = ranking.cognitive !== undefined ? ranking.cognitive : ranking.cognitiveLoad;
  const depVal = ranking.deps !== undefined ? ranking.deps : ranking.dependencies;

  const normalizedParts = [
    normalizeRankingLevel(ranking.complexity),
    normalizeRankingLevel(ranking.uncertainty),
    normalizeRankingLevel(cogVal),
    normalizeRankingLevel(depVal),
    normalizeRankingLevel(ranking.risk),
  ];

  if (!sizeVal && normalizedParts.every((v) => !v)) return '';

  const parts = [sizeVal || '?', ...normalizedParts.map((v) => v || '?')];
  return ` (${parts.join('-')})`;
}

function summarizeVotesForAudit(participants) {
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

function getCurrentRevealTimestamp(session) {
  const history = Array.isArray(session?.resultsHistory) ? session.resultsHistory : [];
  const current = session?.currentRevealId
    ? history.find((item) => item && item.id === session.currentRevealId)
    : history[0];
  return Number(current?.revealedAt || Date.now());
}

function formatAuditTimestampEst(timestamp) {
  const t = Number(timestamp);
  const date = new Date(isNaN(t) ? Date.now() : t);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} EST`;
}

function buildAuditClipboardText(session, sessionId) {
  if (!session || session.status !== 'revealed') return '';

  const participants = session.participants || {};
  const summary = summarizeVotesForAudit(participants);
  const votedEntries = summary.entries.filter(([, p]) => !!p?.hasVoted);
  const totalCount = summary.entries.length;
  const votedCount = votedEntries.length;
  const revealEst = formatAuditTimestampEst(getCurrentRevealTimestamp(session));

  const hasFinalDecision = session.finalDecision !== null && session.finalDecision !== undefined;
  const finalText = hasFinalDecision ? `**${session.finalDecision} SP**` : 'Not set';
  const avgText = summary.avg !== null ? summary.avg.toFixed(1) : '—';
  const consensusText =
    summary.distinctNumericVotes === 0 ? 'No votes' : summary.isConsensus ? 'Consensus Reached' : 'No Consensus';
  const nearestText = summary.avg !== null ? `${summary.nearest} SP` : '—';

  const votesLines = votedEntries
    .map(([, participant]) => {
      const name = safeText(participant?.name || 'Anonymous') || 'Anonymous';
      const vote = participant?.vote ?? '—';
      return `    - ${name}: ${vote}${getParticipantRankingSummary(participant)}`;
    })
    .join('\n');

  const storyText = safeText(session.story) || 'Untitled story';

  return [
    '#### AVB Planning Poker Results',
    '- Story name: **' + storyText + '**',
    '- Final: ' + finalText,
    '- Stats: Avg ' +
      avgText +
      ' | ' +
      consensusText +
      ' | Near ' +
      nearestText +
      ' | Voted ' +
      votedCount +
      '/' +
      totalCount,
    '- Votes: ',
    votesLines || '    - none',
  ].join('\n');
}

function normalizeRankingLevel(value) {
  if (value === null || value === undefined || value === '') return null;

  const numeric = Number(value);
  if (!isNaN(numeric)) {
    if (numeric === 1) return 'L';
    if (numeric === 2) return 'M';
    if (numeric === 3) return 'H';
    return String(value);
  }

  const lowered = String(value).trim().toLowerCase();
  if (!lowered) return null;
  if (lowered === 'low' || lowered === 'l') return 'L';
  if (lowered === 'medium' || lowered === 'med' || lowered === 'm') return 'M';
  if (lowered === 'high' || lowered === 'h') return 'H';
  return String(value).trim();
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

  // Strip markdown bold/italic formatting to support AI's markdown output style
  const cleaned = text.replace(/\*\*([^*\n]+)\*\*/g, '$1').replace(/\*([^*\n]+)\*/g, '$1');

  const lines = cleaned.split(/\r?\n/);

  const get = (label) => {
    const match = cleaned.match(new RegExp(`^${label}\\s*:\\s*(.+)$`, 'im'));
    return match ? match[1].trim() : null;
  };

  const knownLabelPattern =
    /^(Size|Complexity|Uncertainty|Cognitive Load|Dependencies|Risk|Suggested Story Points|Confidence|Confidence Feedback)\s*:/i;

  const getReason = (label) => {
    const labelRegex = new RegExp(`^${label}\\s*:`, 'i');
    for (let i = 0; i < lines.length - 1; i++) {
      if (labelRegex.test(lines[i].trim())) {
        const nextLine = lines[i + 1];
        const dashMatch = nextLine.match(/^\s*-\s+(.+)$/);
        if (dashMatch) return dashMatch[1].trim();
        // Also accept a plain text line (e.g. markdown-stripped italic from AI)
        const plainText = nextLine.trim();
        if (plainText && !knownLabelPattern.test(plainText) && !plainText.startsWith('---')) {
          return plainText;
        }
        return null;
      }
    }
    return null;
  };

  const getBlockText = (label) => {
    const labelRegex = new RegExp(`^${label}\s*:\s*(.*)$`, 'i');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(labelRegex);
      if (!match) continue;

      const blockLines = [];
      const firstLine = match[1].trim();
      if (firstLine) blockLines.push(firstLine);

      for (let j = i + 1; j < lines.length; j++) {
        const candidate = lines[j];
        const trimmed = candidate.trim();
        if (knownLabelPattern.test(trimmed) || trimmed.startsWith('---')) break;
        blockLines.push(trimmed);
      }

      while (blockLines.length && !blockLines[0]) blockLines.shift();
      while (blockLines.length && !blockLines[blockLines.length - 1]) blockLines.pop();

      return blockLines.join('\n').trim() || null;
    }

    return null;
  };

  const rawSize = get('Size');
  const rawComplexity = get('Complexity');
  const rawUncertainty = get('Uncertainty');
  const rawCognitive = get('Cognitive Load');
  const rawDeps = get('Dependencies');
  const rawRisk = get('Risk');
  const rawConfidence = get('Confidence');

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
  const confidenceNum = rawConfidence ? parseInt(rawConfidence, 10) : null;
  const confidence =
    Number.isInteger(confidenceNum) && confidenceNum >= 1 && confidenceNum <= 10 ? confidenceNum : null;
  const confidenceFeedback = getBlockText('Confidence Feedback');

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
    confidence,
    confidenceFeedback,
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
  getRevealDisabledReason,
  getNextStoryDisabledReason,
  buildAuditClipboardText,
  calculateSP,
  generateSessionId,
  isRoomExpired,
  parseJiraPromptResponse,
  setJiraPromptSidebarExpanded,
  toggleJiraPromptSidebar,
  getParticipantRankingSummary,
  summarizeVotesForAudit,
  getCurrentRevealTimestamp,
  formatAuditTimestampEst,
};
