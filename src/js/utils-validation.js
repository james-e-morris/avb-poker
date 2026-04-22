/**
 * Validation Utilities
 * Input validation and state checking helpers
 */

'use strict';

// Import safeText from utils-string for use in getRevealDisabledReason
const { safeText } = require('./utils-string.js');

function getRevealDisabledReason(session, isModerator, votedCount) {
  if (!isModerator || votedCount <= 0) return '';
  if (!safeText(session && session.story)) return 'Story name must be provided';
  return '';
}

function getNextStoryDisabledReason(session, isModerator) {
  if (!isModerator || !session || session.status !== 'revealed') return '';
  const hasFinal = session.finalDecision !== null && session.finalDecision !== undefined;
  if (!hasFinal) return 'Final pick must be selected';
  return '';
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

// Exports for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getRevealDisabledReason,
    getNextStoryDisabledReason,
    normalizeRankingLevel,
    getParticipantRankingSummary,
  };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.getRevealDisabledReason = getRevealDisabledReason;
  window.getNextStoryDisabledReason = getNextStoryDisabledReason;
  window.normalizeRankingLevel = normalizeRankingLevel;
  window.getParticipantRankingSummary = getParticipantRankingSummary;
}
