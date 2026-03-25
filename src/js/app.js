/* ============================================================
  AVB Planning Poker — app.js
  ============================================================ */
'use strict';

// ---- App State ---------------------------------------------

const state = {
  sessionId: null,
  userId: null,
  userName: null,
  isModerator: false,
  currentVote: null,
  sessionData: null,
  dbMode: 'demo', // 'ably' | 'demo'
  wasRevealed: false, // track for flip animation
  demoPoller: null,
  unsubAbly: null,
  pendingSession: null,
  initialStoryPromptChecked: false,
  calcSelections: {
    size: 1,
    complexity: 1,
    uncertainty: 1,
    cognitive: 1,
    deps: 1,
    risk: 1,
  },
  selectedExampleId: null,
};

const EXAMPLE_SCENARIOS = [
  {
    id: 'baseline-min',
    group: 'Calibration',
    title: 'Baseline tiny change',
    params: { size: 1, complexity: 1, uncertainty: 1, cognitive: 1, deps: 1, risk: 1 },
    backend: 'Add an optional query parameter to an existing GET endpoint and update one unit test.',
    frontend: 'Rename one field label and helper text in an existing settings form.',
  },
  {
    id: 'size1-high-complexity',
    group: 'Calibration',
    title: 'Tiny scope, high complexity',
    params: { size: 1, complexity: 3, uncertainty: 1, cognitive: 1, deps: 1, risk: 1 },
    backend: 'Fix a race condition in webhook idempotency handling inside an existing worker.',
    frontend: 'Patch an optimistic-update rollback bug in inline table editing.',
  },
  {
    id: 'size1-high-uncertainty',
    group: 'Calibration',
    title: 'Tiny scope, high uncertainty',
    params: { size: 1, complexity: 1, uncertainty: 3, cognitive: 1, deps: 1, risk: 1 },
    backend: 'Spike a small endpoint against a third-party fraud API with incomplete docs.',
    frontend: 'Prototype one onboarding step while required fields are still being finalized.',
  },
  {
    id: 'size1-high-cognitive',
    group: 'Calibration',
    title: 'Tiny scope, high cognitive load',
    params: { size: 1, complexity: 1, uncertainty: 1, cognitive: 3, deps: 1, risk: 1 },
    backend: 'Refactor a legacy discount-rule evaluator without changing current outputs.',
    frontend: 'Untangle nested permission states in admin panel toggle flows.',
  },
  {
    id: 'size1-high-deps',
    group: 'Calibration',
    title: 'Tiny scope, high dependencies',
    params: { size: 1, complexity: 1, uncertainty: 1, cognitive: 1, deps: 3, risk: 1 },
    backend: 'Add one field that must propagate through API gateway, auth service, and notifications.',
    frontend: 'Ship one profile attribute that depends on backend contract and shared design tokens.',
  },
  {
    id: 'size1-high-risk',
    group: 'Calibration',
    title: 'Tiny scope, high risk',
    params: { size: 1, complexity: 1, uncertainty: 1, cognitive: 1, deps: 1, risk: 3 },
    backend: 'Hotfix token-refresh logic on the login path to prevent session invalidation.',
    frontend: 'Fix checkout primary-action state on payment confirmation path.',
  },
  {
    id: 'balanced-medium',
    group: 'Delivery',
    title: 'Balanced medium story',
    params: { size: 3, complexity: 2, uncertainty: 2, cognitive: 2, deps: 2, risk: 2 },
    backend: 'Build paginated audit-log API with filters and basic indexing.',
    frontend: 'Build audit-log table with filters, pagination, and empty/error states.',
  },
  {
    id: 'integration-heavy',
    group: 'Delivery',
    title: 'Integration-heavy workflow',
    params: { size: 5, complexity: 2, uncertainty: 2, cognitive: 2, deps: 3, risk: 2 },
    backend: 'Implement order-status sync between internal DB and external ERP with retries.',
    frontend: 'Add order timeline UI driven by new sync events across services.',
  },
  {
    id: 'discovery-spike',
    group: 'Discovery',
    title: 'Discovery spike',
    params: { size: 2, complexity: 1, uncertainty: 3, cognitive: 2, deps: 1, risk: 2 },
    backend: 'Prototype semantic-search API using vector index plus fallback keyword query.',
    frontend: 'Prototype search UX with relevance badges and zero-result guidance.',
  },
  {
    id: 'max-profile',
    group: 'Stretch',
    title: 'Maximum profile',
    params: { size: 8, complexity: 3, uncertainty: 3, cognitive: 3, deps: 3, risk: 3 },
    backend: 'Migrate to multi-tenant permissions across auth, API, and reporting services.',
    frontend: 'Rework navigation and guarded routes for tenant-aware roles across the app.',
  },
];

// Keep runtime helpers in app.js so production does not depend on app-exports.js.
const FIBONACCI_CARDS = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];

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

function getConsensusFinalDecision(participants) {
  const summary = summarizeVotes(participants || {});
  if (!summary.isConsensus || summary.distinctNumericVotes === 0) return null;

  const numericVote = summary.entries.map(([, p]) => parseFloat(p.vote)).find((v) => !isNaN(v));
  if (numericVote === undefined) return null;
  return formatCalcNumber(numericVote);
}

function hasFinalDecision(session) {
  return session && session.finalDecision !== null && session.finalDecision !== undefined;
}

function canStartNextStory(session) {
  if (!session || session.status !== 'revealed') return true;
  return hasFinalDecision(session);
}

function buildRevealHistoryEntry(session) {
  const summary = summarizeVotes(session.participants || {});
  const id = `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    revealedAt: Date.now(),
    story: safeText(session.story) || 'Untitled story',
    avg: summary.avg,
    isConsensus: summary.isConsensus,
    distinctVotes: summary.distinctNumericVotes,
    nearest: summary.nearest,
    finalDecision: session.finalDecision || null,
    votes: summary.entries.map(([uid, p]) => ({
      uid,
      name: (p.name || 'Anonymous').slice(0, 24),
      vote: p.hasVoted ? (p.vote ?? '—') : '✗',
    })),
  };
}

function appendRevealHistoryEntry(session) {
  const history = Array.isArray(session.resultsHistory) ? session.resultsHistory : [];
  const entry = buildRevealHistoryEntry(session);
  session.resultsHistory = [entry, ...history];
  session.currentRevealId = entry.id;
}

function applyFinalDecisionToHistory(session, value) {
  const history = Array.isArray(session.resultsHistory) ? session.resultsHistory : [];
  if (!history.length) return;

  const target = session.currentRevealId ? history.find((item) => item.id === session.currentRevealId) : history[0];
  if (!target) return;

  target.finalDecision = value || null;
}

function formatRevealTimestamp(timestamp) {
  const t = Number(timestamp);
  if (!t) return 'Unknown time';

  const d = new Date(t);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();

  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function setHistorySidebarExpanded(expanded) {
  const gameView = document.getElementById('view-game');
  const sidebar = document.getElementById('history-sidebar');
  const openBtn = document.getElementById('btn-toggle-history-float');
  if (!gameView || !sidebar || !openBtn) return;

  gameView.classList.toggle('history-open', !!expanded);
  sidebar.classList.toggle('is-collapsed', !expanded);
  openBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  openBtn.hidden = !!expanded;
}

function toggleHistorySidebar() {
  const gameView = document.getElementById('view-game');
  if (!gameView) return;
  setHistorySidebarExpanded(!gameView.classList.contains('history-open'));
}

function setExamplesSidebarExpanded(expanded) {
  const gameView = document.getElementById('view-game');
  const sidebar = document.getElementById('examples-sidebar');
  const openBtn = document.getElementById('btn-toggle-examples-float');
  if (!gameView || !sidebar || !openBtn) return;

  gameView.classList.toggle('examples-open', !!expanded);
  sidebar.classList.toggle('is-collapsed', !expanded);
  openBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  openBtn.hidden = !!expanded;
}

function toggleExamplesSidebar() {
  const gameView = document.getElementById('view-game');
  if (!gameView) return;
  setExamplesSidebarExpanded(!gameView.classList.contains('examples-open'));
}

function openStoryModal() {
  const modal = document.getElementById('modal-story');
  const storyInput = document.getElementById('story-input');
  if (!modal || !storyInput) return;

  storyInput.value = state.sessionData ? state.sessionData.story || '' : '';
  if (modal.hasAttribute('hidden')) {
    modal.removeAttribute('hidden');
  }
  storyInput.focus();
}

// ---- Ably Realtime ----------------------------------------

let ablyRealtime = null;
let ablyChannel = null;

function getMaskedAblyKey(key) {
  if (!key) return '(missing)';
  if (key.length <= 8) return '(present)';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function tryInitAbly() {
  try {
    if (typeof Ably === 'undefined') return false;
    if (typeof ABLY_CONFIG === 'undefined') return false;
    if (!ABLY_CONFIG.apiKey || ABLY_CONFIG.apiKey.includes('YOUR_ABLY_API_KEY')) return false;

    ablyRealtime = new Ably.Realtime({
      key: ABLY_CONFIG.apiKey,
      clientId: getUserId(),
    });
    return true;
  } catch (e) {
    console.warn('[Planning Poker] Ably init failed, using demo mode:', e.message);
    return false;
  }
}

function toAblyActionError(err, action) {
  const code = getAblyErrorCode(err);
  const message = err?.message || err?.response?.error?.message || 'Unknown Ably error';
  const prefix = (ABLY_CONFIG && ABLY_CONFIG.channelPrefix) || 'avb-poker';

  if (code === 40160) {
    return new Error(
      `Ably key permission error (${code}) while ${action}. Add publish, subscribe, and history capabilities for "${prefix}:*" in your Ably app key.`
    );
  }

  if (code === 400 && /xhr error occurred/i.test(message)) {
    return new Error(
      `Ably network request failed while ${action}. Check ABLY_API_KEY format, browser/network blocking, and that Ably is reachable from this device.`
    );
  }

  return new Error(`Ably error${code ? ` (${code})` : ''} while ${action}: ${message}`);
}

function ablyPublishState(channel, session) {
  return new Promise((resolve, reject) => {
    channel.publish('session_state', session, (err) => {
      if (err) return reject(toAblyActionError(err, 'publishing session state'));
      return resolve();
    });
  });
}

function ablyGetLatestState(channel) {
  return new Promise((resolve, reject) => {
    channel.history({ limit: 50 }, (err, page) => {
      if (err) return reject(toAblyActionError(err, 'reading room history'));
      if (!page || !page.items) return resolve(null);
      const snapshot = page.items.find((item) => item.name === 'session_state');
      return resolve(snapshot ? snapshot.data : null);
    });
  });
}

async function getLatestAblySession(sessionId) {
  if (!ablyRealtime) return null;
  const channel = ablyRealtime.channels.get(getAblyChannelName(sessionId));
  return ablyGetLatestState(channel);
}

function roomTtlMs() {
  const ttlMinutes = Number((ABLY_CONFIG && ABLY_CONFIG.roomTtlMinutes) || 120);
  return Math.max(5, ttlMinutes) * 60 * 1000;
}

function publishPendingSessionIfNeeded(channel) {
  if (!state.isModerator || !state.pendingSession || !channel) return Promise.resolve(false);

  const initial = deepClone(state.pendingSession);
  state.pendingSession = null;

  return ablyPublishState(channel, initial).then(() => true);
}

// ---- Demo Mode (BroadcastChannel + localStorage) -----------

const DEMO_KEY = 'pp_sessions_v2';
let broadcastChannel = null;

function initDemoMode() {
  try {
    broadcastChannel = new BroadcastChannel('planning_poker_demo');
    broadcastChannel.onmessage = (e) => {
      if (e.data && e.data.type === 'update' && e.data.sessionId === state.sessionId) {
        handleSessionData(e.data.session);
      }
    };
  } catch (_) {
    broadcastChannel = null; // BroadcastChannel not supported (old browsers)
  }
}

function getDemoSessions() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) || '{}');
  } catch (_) {
    return {};
  }
}

function saveDemoSession(sessionId, sessionData) {
  const all = getDemoSessions();
  all[sessionId] = sessionData;
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(all));
  } catch (_) {}
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'update', sessionId, session: sessionData });
  }
}

function getDemoSession(sessionId) {
  return getDemoSessions()[sessionId] || null;
}

function startDemoPoller(sessionId) {
  stopDemoPoller();
  state.demoPoller = setInterval(() => {
    const s = getDemoSession(sessionId);
    if (s) handleSessionData(s);
  }, 600);
}

function stopDemoPoller() {
  if (state.demoPoller) {
    clearInterval(state.demoPoller);
    state.demoPoller = null;
  }
}

// ---- User Identity -----------------------------------------

function getUserId() {
  let id = localStorage.getItem('pp_uid');
  if (!id) {
    id = 'u_' + crypto.getRandomValues(new Uint32Array(2)).join('_');
    localStorage.setItem('pp_uid', id);
  }
  return id;
}

// ---- Session CRUD ------------------------------------------

async function createSession(sessionName, userName) {
  const sessionId = generateSessionId();
  const userId = getUserId();

  const session = {
    name: sessionName || 'Planning Session',
    story: '',
    moderatorId: userId,
    status: 'voting',
    createdAt: Date.now(),
    expiresAt: Date.now() + roomTtlMs(),
    finalDecision: null,
    currentRevealId: null,
    resultsHistory: [],
    participants: {
      [userId]: {
        name: safeText(userName),
        vote: null,
        hasVoted: false,
        joinedAt: Date.now(),
      },
    },
  };

  if (state.dbMode === 'ably') {
    state.pendingSession = deepClone(session);
  } else {
    saveDemoSession(sessionId, session);
  }

  state.sessionId = sessionId;
  state.userId = userId;
  state.userName = safeText(userName);
  state.isModerator = true;
  return sessionId;
}

async function joinSession(sessionId, userName) {
  const userId = getUserId();
  const cleanName = safeText(userName);

  if (state.dbMode === 'ably') {
    const latest = await getLatestAblySession(sessionId);
    if (!latest) throw new Error('Session not found.');
    if (isRoomExpired(latest)) throw new Error('Session expired. Ask moderator to create a new room.');

    const updated = deepClone(latest);
    updated.participants = updated.participants || {};
    updated.participants[userId] = { name: cleanName, vote: null, hasVoted: false, joinedAt: Date.now() };

    const channel = ablyRealtime.channels.get(getAblyChannelName(sessionId));
    await ablyPublishState(channel, updated);

    state.sessionId = sessionId;
    state.userId = userId;
    state.userName = cleanName;
    state.isModerator = updated.moderatorId === userId;
  } else {
    const session = getDemoSession(sessionId);
    if (!session) throw new Error('Session not found.');

    session.participants = session.participants || {};
    session.participants[userId] = { name: cleanName, vote: null, hasVoted: false, joinedAt: Date.now() };
    saveDemoSession(sessionId, session);

    state.sessionId = sessionId;
    state.userId = userId;
    state.userName = cleanName;
    state.isModerator = session.moderatorId === userId;
  }
}

async function castVote(value) {
  const { sessionId, userId } = state;
  if (!sessionId || !userId) return;
  state.currentVote = value;

  if (state.dbMode === 'ably') {
    const session = state.sessionData ? deepClone(state.sessionData) : await getLatestAblySession(sessionId);
    if (!session || !session.participants || !session.participants[userId]) return;

    session.participants[userId].vote = value;
    session.participants[userId].hasVoted = true;

    const channel = ablyRealtime.channels.get(getAblyChannelName(sessionId));
    await ablyPublishState(channel, session);
  } else {
    const session = getDemoSession(sessionId);
    if (session && session.participants && session.participants[userId]) {
      session.participants[userId].vote = value;
      session.participants[userId].hasVoted = true;
      saveDemoSession(sessionId, session);
    }
  }

  renderVoteCards(value);
}

async function revealVotes() {
  const { sessionId } = state;
  if (!sessionId || !state.isModerator) return;

  if (state.dbMode === 'ably') {
    const session = state.sessionData ? deepClone(state.sessionData) : await getLatestAblySession(sessionId);
    if (!session) return;
    if (session.status === 'revealed') return;
    session.finalDecision = getConsensusFinalDecision(session.participants || {});
    appendRevealHistoryEntry(session);
    session.status = 'revealed';
    const channel = ablyRealtime.channels.get(getAblyChannelName(sessionId));
    await ablyPublishState(channel, session);
  } else {
    const session = getDemoSession(sessionId);
    if (session) {
      if (session.status === 'revealed') return;
      session.finalDecision = getConsensusFinalDecision(session.participants || {});
      appendRevealHistoryEntry(session);
      session.status = 'revealed';
      saveDemoSession(sessionId, session);
    }
  }
}

async function setFinalDecision(value) {
  const { sessionId } = state;
  if (!sessionId || !state.isModerator) return;

  if (state.dbMode === 'ably') {
    const session = state.sessionData ? deepClone(state.sessionData) : await getLatestAblySession(sessionId);
    if (!session || session.status !== 'revealed') return;
    session.finalDecision = value || null;
    applyFinalDecisionToHistory(session, value || null);
    const channel = ablyRealtime.channels.get(getAblyChannelName(sessionId));
    await ablyPublishState(channel, session);
  } else {
    const session = getDemoSession(sessionId);
    if (!session || session.status !== 'revealed') return;
    session.finalDecision = value || null;
    applyFinalDecisionToHistory(session, value || null);
    saveDemoSession(sessionId, session);
  }
}

async function nextStory(storyName) {
  const { sessionId } = state;
  if (!sessionId || !state.isModerator) return;
  const cleanStoryName = safeText(storyName);

  if (state.dbMode === 'ably') {
    const session = state.sessionData ? deepClone(state.sessionData) : await getLatestAblySession(sessionId);
    if (session) {
      if (!canStartNextStory(session)) {
        showToast('Choose a Final Decision before starting the next story', 'error');
        return;
      }
      session.status = 'voting';
      session.story = cleanStoryName;
      session.finalDecision = null;
      session.currentRevealId = null;
      Object.keys(session.participants || {}).forEach((uid) => {
        session.participants[uid].vote = null;
        session.participants[uid].hasVoted = false;
      });
      const channel = ablyRealtime.channels.get(getAblyChannelName(sessionId));
      await ablyPublishState(channel, session);
    }
  } else {
    const session = getDemoSession(sessionId);
    if (session) {
      if (!canStartNextStory(session)) {
        showToast('Choose a Final Decision before starting the next story', 'error');
        return;
      }
      session.status = 'voting';
      session.story = cleanStoryName;
      session.finalDecision = null;
      session.currentRevealId = null;
      Object.keys(session.participants || {}).forEach((uid) => {
        session.participants[uid].vote = null;
        session.participants[uid].hasVoted = false;
      });
      saveDemoSession(sessionId, session);
    }
  }

  state.currentVote = null;
}

async function setStory(name) {
  const { sessionId } = state;
  if (!sessionId || !state.isModerator) return;
  const clean = safeText(name);

  if (state.dbMode === 'ably') {
    const session = state.sessionData ? deepClone(state.sessionData) : await getLatestAblySession(sessionId);
    if (session) {
      session.story = clean;
      const channel = ablyRealtime.channels.get(getAblyChannelName(sessionId));
      await ablyPublishState(channel, session);
    }
  } else {
    const session = getDemoSession(sessionId);
    if (session) {
      session.story = clean;
      saveDemoSession(sessionId, session);
    }
  }
}

// ---- Real-time Subscription --------------------------------

function subscribeToSession(sessionId) {
  if (state.dbMode === 'ably') {
    ablyChannel = ablyRealtime.channels.get(getAblyChannelName(sessionId));

    const onState = (msg) => {
      if (!msg || msg.name !== 'session_state' || !msg.data) return;
      if (isRoomExpired(msg.data)) {
        showToast('Session expired. Create a new one to continue', 'info');
        leaveGame();
        return;
      }
      handleSessionData(msg.data);
    };

    ablyChannel.subscribe('session_state', onState);
    state.unsubAbly = () => {
      if (ablyChannel) ablyChannel.unsubscribe('session_state', onState);
      ablyChannel = null;
    };

    ablyGetLatestState(ablyChannel)
      .then((latest) => {
        if (latest) {
          if (!isRoomExpired(latest)) handleSessionData(latest);
        } else {
          publishPendingSessionIfNeeded(ablyChannel).catch((err) => {
            console.error('[Planning Poker] Failed to publish initial Ably state:', err);
            showToast(err.message || 'Could not initialize room state', 'error', 7000);
          });
        }
      })
      .catch((err) => {
        console.error('[Planning Poker] Failed to read Ably room history:', err);

        publishPendingSessionIfNeeded(ablyChannel)
          .then((published) => {
            if (!published) {
              showToast(err.message || 'Could not read room state from Ably', 'error', 7000);
            }
          })
          .catch((publishErr) => {
            console.error('[Planning Poker] Failed to publish initial Ably state after history error:', publishErr);
            showToast(publishErr.message || err.message || 'Could not initialize room state from Ably', 'error', 7000);
          });
      });
  } else {
    startDemoPoller(sessionId);
    const s = getDemoSession(sessionId);
    if (s) handleSessionData(s);
  }
}

function unsubscribeFromSession() {
  if (state.unsubAbly) {
    state.unsubAbly();
    state.unsubAbly = null;
  }
  stopDemoPoller();
}

// ---- Handle Real-time Updates ------------------------------

function handleSessionData(session) {
  if (!session) return;

  const previousStatus = state.sessionData ? state.sessionData.status : null;
  const wasRevealed = state.wasRevealed;
  const nowRevealed = session.status === 'revealed';
  const justRevealed = nowRevealed && !wasRevealed;
  const justStartedNextStory = previousStatus === 'revealed' && session.status === 'voting';

  state.sessionData = session;
  state.wasRevealed = nowRevealed;
  state.isModerator = session.moderatorId === state.userId;

  if (!state.initialStoryPromptChecked) {
    state.initialStoryPromptChecked = true;
    const missingStory = !(session.story || '').trim();
    if (state.isModerator && session.status === 'voting' && missingStory) {
      openStoryModal();
    }
  }

  const participants = session.participants || {};

  updateGameHeader(session);
  renderParticipants(participants, session.status, justRevealed, nowRevealed);
  updateStatusBar(participants, session.status);
  renderSessionHistory(session.resultsHistory);

  if (nowRevealed) {
    renderVoteCards(state.currentVote); // show cards disabled
    showResults(session);
  } else {
    if (justStartedNextStory) {
      resetCalculatorSelectionsToDefault();
      updateCalcOutput();
    }
    hideResults();
    // Sync current vote from server
    const me = participants[state.userId];
    if (me && me.hasVoted) {
      state.currentVote = me.vote;
    } else if (!nowRevealed) {
      state.currentVote = null;
    }
    renderVoteCards(state.currentVote);
  }

  updateFooter(participants, session.status);
}

// ---- Calculator --------------------------------------------

function resetCalculatorSelectionsToDefault() {
  applyCalcSelections({
    size: 1,
    complexity: 1,
    uncertainty: 1,
    cognitive: 1,
    deps: 1,
    risk: 1,
  });
}

function applyCalcSelections(nextSelections) {
  state.calcSelections = {
    ...state.calcSelections,
    ...nextSelections,
  };

  document.querySelectorAll('.scale-buttons').forEach((group) => {
    const metric = group.dataset.metric;
    const selectedValue = Number(state.calcSelections[metric]);
    const buttons = group.querySelectorAll('.scale-btn');
    buttons.forEach((btn) => {
      const selected = Number(btn.dataset.value) === selectedValue;
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  });

  updateCalcOutput();
  syncExampleSelectionFromCalc();
}

function paramsMatchSelection(params) {
  return (
    Number(params.size) === Number(state.calcSelections.size) &&
    Number(params.complexity) === Number(state.calcSelections.complexity) &&
    Number(params.uncertainty) === Number(state.calcSelections.uncertainty) &&
    Number(params.cognitive) === Number(state.calcSelections.cognitive) &&
    Number(params.deps) === Number(state.calcSelections.deps) &&
    Number(params.risk) === Number(state.calcSelections.risk)
  );
}

function getMatchingExampleIdForCurrentSelection() {
  const match = EXAMPLE_SCENARIOS.find((item) => paramsMatchSelection(item.params));
  return match ? match.id : null;
}

function updateExampleCardSelection() {
  document.querySelectorAll('.example-entry').forEach((node) => {
    const selected = node.dataset.exampleId === state.selectedExampleId;
    node.classList.toggle('is-selected', selected);
    node.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
}

function syncExampleSelectionFromCalc() {
  state.selectedExampleId = getMatchingExampleIdForCurrentSelection();
  updateExampleCardSelection();
}

function applyExampleScenario(exampleId) {
  const scenario = EXAMPLE_SCENARIOS.find((item) => item.id === exampleId);
  if (!scenario) return;

  state.selectedExampleId = scenario.id;
  applyCalcSelections(scenario.params);
}

function getExampleSummary(params) {
  const metrics = [
    ['complexity', 'Complexity'],
    ['uncertainty', 'Uncertainty'],
    ['cognitive', 'Cognitive'],
    ['deps', 'Dependencies'],
    ['risk', 'Risk'],
  ];

  const toLevel = (value) => ({ 1: 'Low', 2: 'Medium', 3: 'High' })[Number(value)] || String(value);
  const allLow = metrics.every(([key]) => Number(params[key]) === 1);
  const allHigh = Number(params.size) === 8 && metrics.every(([key]) => Number(params[key]) === 3);

  if (allLow) return 'Size 1, all Low';
  if (allHigh) return 'Size 8, all High';

  const highlights = metrics
    .filter(([key]) => Number(params[key]) !== 1)
    .map(([key, label]) => `${label} ${toLevel(params[key])}`);

  if (!highlights.length) {
    return `Size ${params.size}, mostly Low`;
  }

  return `Size ${params.size} • ${highlights.join(' • ')}`;
}

function renderExamplesSidebar() {
  const listEl = document.getElementById('examples-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  const groups = EXAMPLE_SCENARIOS.reduce((acc, item) => {
    const group = item.group || 'Examples';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  Object.entries(groups).forEach(([groupName, scenarios]) => {
    const section = el('section', 'examples-group');
    section.appendChild(el('h4', 'examples-group-title', groupName));

    scenarios.forEach((scenario) => {
      const card = el('button', 'example-entry');
      card.type = 'button';
      card.dataset.exampleId = scenario.id;
      card.setAttribute('aria-pressed', 'false');

      const title = el('div', 'example-entry-title', scenario.title);
      const ratings = el('div', 'example-entry-ratings', getExampleSummary(scenario.params));

      const beLabel = el('div', 'example-label', 'BE');
      const beText = el('div', 'example-text', scenario.backend);
      const feLabel = el('div', 'example-label', 'FE');
      const feText = el('div', 'example-text', scenario.frontend);

      card.appendChild(title);
      card.appendChild(ratings);
      card.appendChild(beLabel);
      card.appendChild(beText);
      card.appendChild(feLabel);
      card.appendChild(feText);

      card.addEventListener('click', () => {
        applyExampleScenario(scenario.id);
        setExamplesSidebarExpanded(true);
      });

      section.appendChild(card);
    });

    listEl.appendChild(section);
  });

  syncExampleSelectionFromCalc();
}

function updateCalcOutput() {
  const size = state.calcSelections.size;
  const c = state.calcSelections.complexity;
  const u = state.calcSelections.uncertainty;
  const cl = state.calcSelections.cognitive;
  const d = state.calcSelections.deps;
  const r = state.calcSelections.risk;

  const result = calculateSP(size, c, u, cl, d, r);
  const formattedRawScore = formatCalcNumber(result.rawScore);
  const complexityMultiplier = formatCalcNumber(result.multipliers.complexity);
  const uncertaintyMultiplier = formatCalcNumber(result.multipliers.uncertainty);
  const cognitiveMultiplier = formatCalcNumber(result.multipliers.cognitive);
  const dependencyMultiplier = formatCalcNumber(result.multipliers.deps);
  const riskMultiplier = formatCalcNumber(result.multipliers.risk);
  const levelLabel = (value) => ({ 1: 'Low', 2: 'Medium', 3: 'High' })[value] || String(value);

  document.getElementById('out-bes').textContent = String(result.sp);
  document.getElementById('out-formula').textContent =
    `${size} x ${complexityMultiplier} x ${uncertaintyMultiplier} x ${cognitiveMultiplier} x ${dependencyMultiplier} x ${riskMultiplier}`;
  document.getElementById('out-formula-total').textContent =
    `= ${formattedRawScore} raw -> ${result.sp} score`;
  document.getElementById('out-sp').textContent = result.sp;

  document.getElementById('out-factor-size').textContent = `${size} (base)`;
  document.getElementById('out-factor-complexity').textContent = `${levelLabel(c)} => x${complexityMultiplier}`;
  document.getElementById('out-factor-uncertainty').textContent = `${levelLabel(u)} => x${uncertaintyMultiplier}`;
  document.getElementById('out-factor-cognitive').textContent = `${levelLabel(cl)} => x${cognitiveMultiplier}`;
  document.getElementById('out-factor-deps').textContent = `${levelLabel(d)} => x${dependencyMultiplier}`;
  document.getElementById('out-factor-risk').textContent = `${levelLabel(r)} => x${riskMultiplier}`;

  const voteBtn = document.getElementById('btn-vote-calc');
  voteBtn.dataset.sp = result.sp;
  voteBtn.textContent = `Vote ${result.sp}`;

  // Keep Fibonacci cards visually in sync with the current calculator suggestion.
  if (document.getElementById('vote-cards')) {
    renderVoteCards(state.currentVote);
  }
}

function getScaleExample(metric, value) {
  const examples = {
    size: {
      1: 'Tiny\nSmall tweak in one place',
      2: 'Small\nStraightforward change',
      3: 'Standard\nA few coordinated updates',
      5: 'Large\nMulti-step workflow change',
      8: 'Very large\nCross-team/cross-system scope',
    },
    complexity: {
      1: 'Low complexity\nClear path, low branching',
      2: 'Medium complexity\nSome branching and edge cases',
      3: 'High complexity\nMany moving parts and states',
    },
    uncertainty: {
      1: 'Low uncertainty\nRequirements are clear',
      2: 'Medium uncertainty\nA few open questions',
      3: 'High uncertainty\nKey assumptions are unresolved',
    },
    cognitive: {
      1: 'Low cognitive load\nEasy to reason about',
      2: 'Medium cognitive load\nMultiple concepts to track',
      3: 'High cognitive load\nComplex coordination required',
    },
    deps: {
      1: 'Low dependencies\nMostly self-contained',
      2: 'Medium dependencies\nSome external coordination',
      3: 'High dependencies\nMultiple teams/systems involved',
    },
    risk: {
      1: 'Low risk\nLow user impact if wrong',
      2: 'Medium risk\nNoticeable impact if wrong',
      3: 'High risk\nCritical impact if wrong',
    },
  };

  return examples[metric]?.[value] || '';
}

let calcPopoverEl = null;
let calcPopoverOwner = null;
let calcPopoverBound = false;

function ensureCalcPopoverElement() {
  if (calcPopoverEl && document.body.contains(calcPopoverEl)) return calcPopoverEl;

  calcPopoverEl = document.createElement('div');
  calcPopoverEl.className = 'calc-popover';
  calcPopoverEl.setAttribute('role', 'tooltip');
  calcPopoverEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(calcPopoverEl);
  return calcPopoverEl;
}

function positionCalcPopover(button) {
  const popover = ensureCalcPopoverElement();
  if (!button || !document.body.contains(button)) return;

  const buttonRect = button.getBoundingClientRect();
  const tipRect = popover.getBoundingClientRect();
  const margin = 8;
  const gap = 12;

  let left = buttonRect.left + buttonRect.width / 2 - tipRect.width / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin));

  let top = buttonRect.bottom + gap;
  let above = false;

  if (top + tipRect.height > window.innerHeight - margin) {
    top = buttonRect.top - tipRect.height - gap;
    above = true;
  }

  if (top < margin) {
    top = margin;
    above = false;
  }

  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top)}px`;
  popover.classList.toggle('is-above', above);
}

function showCalcPopover(button) {
  const text = button?.dataset?.popover;
  if (!button || !text) return;

  const popover = ensureCalcPopoverElement();
  calcPopoverOwner = button;
  popover.textContent = text;
  popover.classList.add('is-visible');
  popover.setAttribute('aria-hidden', 'false');
  positionCalcPopover(button);
}

function hideCalcPopover(owner) {
  if (owner && owner !== calcPopoverOwner) return;
  if (!calcPopoverEl) return;

  calcPopoverOwner = null;
  calcPopoverEl.classList.remove('is-visible', 'is-above');
  calcPopoverEl.setAttribute('aria-hidden', 'true');
}

function bindCalcPopoverGlobals() {
  if (calcPopoverBound) return;
  calcPopoverBound = true;

  window.addEventListener('resize', () => {
    if (calcPopoverOwner) {
      positionCalcPopover(calcPopoverOwner);
    }
  });

  window.addEventListener(
    'scroll',
    () => {
      if (calcPopoverOwner) {
        positionCalcPopover(calcPopoverOwner);
      }
    },
    true
  );

  document.addEventListener('pointerdown', (event) => {
    if (!calcPopoverOwner) return;
    if (event.target === calcPopoverOwner || calcPopoverOwner.contains(event.target)) return;
    hideCalcPopover();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hideCalcPopover();
  });
}

function setupCalcButtons() {
  bindCalcPopoverGlobals();
  ensureCalcPopoverElement();

  const groups = document.querySelectorAll('.scale-buttons');
  groups.forEach((group) => {
    const metric = group.dataset.metric;
    const buttons = group.querySelectorAll('.scale-btn');

    buttons.forEach((btn) => {
      const value = Number(btn.dataset.value);
      const example = getScaleExample(metric, value);
      if (example) {
        btn.dataset.popover = example;

        if (!btn.dataset.popoverBound) {
          btn.dataset.popoverBound = 'true';

          btn.addEventListener('pointerenter', () => showCalcPopover(btn));
          btn.addEventListener('focus', () => showCalcPopover(btn));

          btn.addEventListener('pointerleave', (event) => {
            const nextButton = event.relatedTarget?.closest?.('.scale-btn[data-popover]');
            if (nextButton) {
              showCalcPopover(nextButton);
              return;
            }
            hideCalcPopover(btn);
          });

          btn.addEventListener('blur', () => hideCalcPopover(btn));

          btn.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
              hideCalcPopover(btn);
              btn.blur();
            }
          });
        }
      }

      btn.addEventListener('click', () => {
        hideCalcPopover();
        applyCalcSelections({ [metric]: value });
      });
    });
  });
}

function setCalcDetailsExpanded(expanded) {
  const calculator = document.querySelector('.calculator');
  const details = document.getElementById('calc-details');
  const toggleBtn = document.getElementById('btn-toggle-calc-details');
  if (!calculator || !details || !toggleBtn) return;

  if (expanded) {
    details.removeAttribute('hidden');
    calculator.classList.add('calc-details-open');
    calculator.classList.remove('calc-details-hidden');
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.textContent = 'Hide details';
    return;
  }

  details.setAttribute('hidden', '');
  calculator.classList.remove('calc-details-open');
  calculator.classList.add('calc-details-hidden');
  toggleBtn.setAttribute('aria-expanded', 'false');
  toggleBtn.textContent = 'Show details';
}

function syncCalcLabelWidth() {
  const inputs = document.querySelector('.calc-inputs');
  if (!inputs) return;

  inputs.classList.remove('calc-compact-buttons');

  // CSS (fit-content(45%) + column-direction labels) handles label sizing automatically.
  // Only apply compact-buttons if buttons are too narrow for full text.
  requestAnimationFrame(() => {
    const btns = inputs.querySelector('.scale-buttons:not(.size-scale)');
    if (!btns) return;
    const btnWidth = btns.getBoundingClientRect().width;
    // 3 buttons × 40px + 2 gaps × 8px = 136px — switch to Med labels below this
    if (btnWidth < 136) {
      inputs.classList.add('calc-compact-buttons');
    }
  });
}

// ---- UI Rendering ------------------------------------------

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function updateGameHeader(session) {
  document.getElementById('game-session-name').textContent = session.name || 'Session';
  document.getElementById('game-story-display').textContent = session.story || '—';

  document.querySelectorAll('.mod-only').forEach((node) => {
    node.style.display = state.isModerator ? '' : 'none';
  });
  document.querySelectorAll('.participant-only').forEach((node) => {
    node.style.display = state.isModerator ? 'none' : '';
  });
}

function renderParticipantName(name, isMe, isMod) {
  const wrapper = el('div', 'p-name');
  wrapper.appendChild(el('span', 'p-name-text', name ? name.slice(0, 18) : 'Anonymous'));

  if (isMe) {
    wrapper.appendChild(el('span', 'you-badge', '(you)'));
  }

  if (isMod) {
    wrapper.appendChild(el('span', 'mod-badge', '👑'));
  }

  return wrapper;
}

function renderParticipants(participants, status, justRevealed, nowRevealed) {
  const grid = document.getElementById('participants-grid');
  const entries = Object.entries(participants).sort(([, a], [, b]) => (a.joinedAt || 0) - (b.joinedAt || 0));

  // Clear and rebuild
  grid.innerHTML = '';

  entries.forEach(([uid, p], i) => {
    const isMe = uid === state.userId;
    const isMod = state.sessionData && state.sessionData.moderatorId === uid;

    const wrapper = el('div', 'participant-card');

    // 3-D inner container — start un-flipped, flip via JS for animation
    const inner = el('div', 'p-card-inner');

    // Front face
    const front = el('div', 'p-card-front' + (p.hasVoted ? '' : ' unvoted'));
    if (p.hasVoted) {
      front.appendChild(el('div', 'card-voted-dot'));
    }

    // Back face (the vote value, hidden until flipped)
    const back = el('div', `p-card-back ${voteColorClass(p.vote)}`);
    const voteEl = el('span', 'p-vote-value', nowRevealed ? (p.vote ?? '—') : '');
    back.appendChild(voteEl);

    inner.appendChild(front);
    inner.appendChild(back);
    wrapper.appendChild(inner);

    // Name row
    wrapper.appendChild(renderParticipantName(p.name, isMe, isMod));
    grid.appendChild(wrapper);

    // Staggered flip animation
    if (nowRevealed) {
      if (justRevealed) {
        // Animate
        setTimeout(() => inner.classList.add('is-flipped'), 60 + i * 140);
      } else {
        // Reconnecting to already-revealed session — show immediately
        inner.classList.add('is-flipped');
      }
    }
  });
}

function renderVoteCards(selectedVote) {
  const container = document.getElementById('vote-cards');
  const isRevealed = state.sessionData && state.sessionData.status === 'revealed';
  const suggestedVote = String(document.getElementById('btn-vote-calc')?.dataset.sp || '');

  container.innerHTML = '';

  FIBONACCI_CARDS.forEach((val) => {
    const isSelected = selectedVote === val;
    const showSuggestedPreview = !isRevealed && !isSelected && suggestedVote === val;
    const btn = el(
      'button',
      `vote-card${isSelected ? ' selected' : ''}${showSuggestedPreview ? ' suggested-preview' : ''}`
    );
    btn.textContent = val;
    btn.disabled = !!isRevealed;
    btn.dataset.value = val;
    if (isSelected) btn.setAttribute('aria-pressed', 'true');

    btn.addEventListener('click', () => {
      if (!isRevealed) castVote(val);
    });
    container.appendChild(btn);
  });
}

function updateStatusBar(participants, status) {
  const bar = document.getElementById('status-bar');
  const textEl = document.getElementById('status-text');

  if (status === 'revealed') {
    textEl.textContent = 'Revealed. Results below.';
    bar.className = 'status-bar';
    return;
  }

  const entries = Object.entries(participants);
  const voted = entries.filter(([, p]) => p.hasVoted).length;
  const total = entries.length;
  const allVoted = voted === total && total > 0;

  if (allVoted) {
    textEl.textContent = 'All votes in. Ready to reveal.';
    bar.className = 'status-bar status-ready';
  } else {
    textEl.textContent = `${total - voted} player${total - voted !== 1 ? 's' : ''} left to vote`;
    bar.className = 'status-bar';
  }
}

function renderFinalDecisionPicker(currentDecision, canEdit) {
  const pickerEl = document.getElementById('results-final-picker');
  if (!pickerEl) return;

  pickerEl.innerHTML = '';
  pickerEl.hidden = !canEdit;
  if (!canEdit) return;

  const cardValues = FIBONACCI_CARDS.filter((v) => !isNaN(parseFloat(v)));
  cardValues.forEach((value) => {
    const btn = el('button', `decision-chip${String(currentDecision) === String(value) ? ' selected' : ''}`, value);
    btn.type = 'button';
    btn.addEventListener('click', () => setFinalDecision(value));
    pickerEl.appendChild(btn);
  });

  const clearBtn = el('button', 'decision-chip clear-chip', 'Clear');
  clearBtn.type = 'button';
  clearBtn.addEventListener('click', () => setFinalDecision(null));
  pickerEl.appendChild(clearBtn);
}

function showResults(session) {
  const participants = session.participants || {};
  const area = document.getElementById('results-area');
  area.removeAttribute('hidden');

  document.getElementById('voting-area').classList.add('voting-disabled');

  const summary = summarizeVotes(participants);
  const entries = summary.entries;
  const avg = summary.avg;
  const isConsensus = summary.isConsensus;

  document.getElementById('results-avg').textContent = avg !== null ? avg.toFixed(1) : '—';
  document.getElementById('results-consensus').textContent =
    summary.distinctNumericVotes === 0 ? 'No votes' : isConsensus ? 'Consensus' : `Split (${summary.distinctNumericVotes})`;
  document.getElementById('results-nearest').textContent = avg !== null ? `${summary.nearest} SP` : '—';

  const hasFinalDecision = session.finalDecision !== null && session.finalDecision !== undefined;
  const finalDecision = hasFinalDecision ? String(session.finalDecision) : null;
  const finalValueEl = document.getElementById('results-final-value');
  const finalHintEl = document.getElementById('results-final-hint');
  const nextStoryBtn = document.getElementById('btn-next-story');
  const revealBtn = document.getElementById('btn-reveal');
  if (finalValueEl) {
    finalValueEl.textContent = hasFinalDecision ? `${finalDecision} SP` : 'Not set';
    finalValueEl.classList.toggle('is-empty', !hasFinalDecision);
  }
  if (finalHintEl) {
    finalHintEl.textContent = hasFinalDecision
      ? 'Final decision set.'
      : state.isModerator
        ? 'Pick the final decision for this story.'
        : 'Waiting for moderator pick.';
  }
  renderFinalDecisionPicker(finalDecision, state.isModerator && session.status === 'revealed');

  if (nextStoryBtn) {
    const canStart = canStartNextStory(session);
    nextStoryBtn.disabled = !canStart;
    nextStoryBtn.title = canStart ? '' : 'Choose a Final Decision first';
  }
  if (revealBtn) {
    revealBtn.hidden = true;
  }

  // Vote chips
  const votesEl = document.getElementById('results-votes');
  votesEl.innerHTML = '';
  entries.forEach(([, p]) => {
    const chip = el('div', 'result-vote-chip');
    const name = el('span', 'rv-name');
    name.textContent = (p.name || 'Anonymous').slice(0, 16);
    const vv = el('span', 'rv-val');
    vv.textContent = p.hasVoted ? (p.vote ?? '—') : '✗';
    chip.appendChild(name);
    chip.appendChild(vv);
    votesEl.appendChild(chip);
  });

  document.getElementById('footer-voting').hidden = true;
  document.getElementById('footer-revealed').hidden = false;

  // Moderator sees Next Story button
  document.querySelectorAll('.mod-only').forEach((n) => {
    n.style.display = state.isModerator ? '' : 'none';
  });
}

function renderSessionHistory(historyItems) {
  const listEl = document.getElementById('session-history-list');
  const emptyEl = document.getElementById('session-history-empty');
  if (!listEl || !emptyEl) return;

  const history = Array.isArray(historyItems)
    ? historyItems.slice().sort((a, b) => Number(b?.revealedAt || 0) - Number(a?.revealedAt || 0))
    : [];

  listEl.innerHTML = '';

  if (!history.length) {
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;

  history.forEach((item) => {
    const row = el('article', 'history-entry');
    const title = el('div', 'history-entry-title');
    const time = el('div', 'history-entry-time', formatRevealTimestamp(item.revealedAt));

    const avg = item.avg === null || item.avg === undefined ? '—' : Number(item.avg).toFixed(1);
    const nearest = item.nearest === null || item.nearest === undefined ? '—' : `${item.nearest} SP`;
    const hasFinal = item.finalDecision !== null && item.finalDecision !== undefined;
    const final = hasFinal ? `${item.finalDecision} SP` : item.isConsensus ? nearest : 'Pending';
    const distinctValues = Number(item.distinctVotes || 0);
    const consensus = distinctValues === 0 ? '—' : item.isConsensus ? 'Yes' : `No (${distinctValues} values)`;

    title.appendChild(el('span', 'history-entry-story', item.story || 'Untitled story'));
    title.appendChild(el('span', 'history-entry-sep', ' - '));
    title.appendChild(el('span', 'history-entry-sp', final));

    const meta = el(
      'div',
      'history-entry-meta',
      `${time.textContent} • Avg ${avg} • ${consensus} • Final ${final}`
    );

    const voteText = (item.votes || []).map((vote) => `${vote.name || 'Anonymous'}: ${vote.vote ?? '—'}`).join(' | ');
    const votes = el('div', 'history-entry-votes', voteText || 'No votes');

    row.appendChild(title);
    row.appendChild(meta);
    row.appendChild(votes);
    listEl.appendChild(row);
  });
}

function hideResults() {
  document.getElementById('results-area').setAttribute('hidden', '');
  document.getElementById('voting-area').classList.remove('voting-disabled');
  document.getElementById('footer-voting').hidden = false;
  document.getElementById('footer-revealed').hidden = true;

  const pickerEl = document.getElementById('results-final-picker');
  if (pickerEl) {
    pickerEl.innerHTML = '';
    pickerEl.hidden = true;
  }
}

function updateFooter(participants, status) {
  if (status === 'revealed') return; // handled by showResults

  const entries = Object.entries(participants);
  const voted = entries.filter(([, p]) => p.hasVoted).length;
  const total = entries.length;

  document.getElementById('vote-count-label').textContent = `${voted} of ${total} voted`;

  const revealBtn = document.getElementById('btn-reveal');
  revealBtn.hidden = !(state.isModerator && voted > 0);
}

// ---- Navigation --------------------------------------------

function showView(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  const target = document.getElementById(`view-${name}`);
  if (target) target.classList.add('active');
}

async function enterGame(sessionId) {
  showView('loading');
  try {
    showView('game');
    setHistorySidebarExpanded(false);
    setExamplesSidebarExpanded(false);
    state.initialStoryPromptChecked = false;
    syncCalcLabelWidth();
    setCalcDetailsExpanded(false);
    subscribeToSession(sessionId);
    renderVoteCards(null);
    updateCalcOutput();

    if (state.dbMode === 'demo') {
      showToast(
        'Demo mode: works across tabs on this browser.',
        'info',
        3600
      );
    } else if (state.dbMode === 'ably') {
      showToast('Realtime mode enabled (Ably).', 'info', 3200);
    }
  } catch (err) {
    console.error('[Planning Poker] Failed to enter game:', err);
    showToast(err.message || 'Failed to join session', 'error');
    showView('home');
    history.replaceState({}, '', window.location.pathname);
  }
}

function leaveGame() {
  unsubscribeFromSession();
  setHistorySidebarExpanded(false);
  setExamplesSidebarExpanded(false);
  setCalcDetailsExpanded(false);
  state.sessionId = null;
  state.sessionData = null;
  state.currentVote = null;
  state.wasRevealed = false;
  state.initialStoryPromptChecked = false;
  renderSessionHistory([]);
  history.replaceState({}, '', window.location.pathname);
  showView('home');
}

// ---- Toast -------------------------------------------------

let toastTimer = null;
function showToast(message, type = 'info', duration = 3000) {
  const t = document.getElementById('toast');
  t.textContent = message; // safe: textContent, not innerHTML
  t.className = `toast toast-${type} visible`;
  t.removeAttribute('hidden');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('visible');
    setTimeout(() => t.setAttribute('hidden', ''), 300);
  }, duration);
}

// ---- Theme -------------------------------------------------

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = theme === 'dark' ? '🌙' : '☀️';
  document.getElementById('btn-toggle-theme').textContent = icon;
  document.getElementById('btn-toggle-theme-game').textContent = icon;
  localStorage.setItem('pp_theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ---- Event Listeners ---------------------------------------

function setupEventListeners() {
  // ---- Home ----
  document.getElementById('btn-create').addEventListener('click', async () => {
    const sessionName = document.getElementById('session-name-input').value.trim();
    const userName = document.getElementById('create-name-input').value.trim();
    if (!userName) {
      showToast('Please enter your name', 'error');
      document.getElementById('create-name-input').focus();
      return;
    }
    try {
      const sessionId = await createSession(sessionName, userName);
      history.pushState({}, '', `?session=${sessionId}`);
      await enterGame(sessionId);
    } catch (err) {
      showToast('Could not create session: ' + err.message, 'error');
    }
  });

  document.getElementById('btn-join').addEventListener('click', async () => {
    const rawId = document
      .getElementById('join-id-input')
      .value.trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const userName = document.getElementById('join-name-input').value.trim();
    if (!rawId) {
      showToast('Please enter a session ID', 'error');
      return;
    }
    if (rawId.length < 4 || rawId.length > 12) {
      showToast('Session ID must be 4-12 characters', 'error');
      return;
    }
    if (!userName) {
      showToast('Please enter your name', 'error');
      document.getElementById('join-name-input').focus();
      return;
    }
    try {
      await joinSession(rawId, userName);
      history.pushState({}, '', `?session=${rawId}`);
      await enterGame(rawId);
    } catch (err) {
      showToast(err.message || 'Could not join session', 'error');
    }
  });

  // Enter key on home inputs
  ['session-name-input', 'create-name-input'].forEach((id) =>
    document.getElementById(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-create').click();
    })
  );
  ['join-id-input', 'join-name-input'].forEach((id) =>
    document.getElementById(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-join').click();
    })
  );

  // Auto-uppercase session ID
  document.getElementById('join-id-input').addEventListener('input', (e) => {
    const pos = e.target.selectionStart;
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    e.target.setSelectionRange(pos, pos);
  });

  // ---- Game Controls ----
  document.getElementById('btn-leave').addEventListener('click', leaveGame);

  document.getElementById('btn-copy-link').addEventListener('click', () => {
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => showToast('Invite link copied!', 'success'));
    } else {
      // Fallback for non-HTTPS contexts
      const tmp = document.createElement('textarea');
      tmp.value = url;
      tmp.style.position = 'fixed';
      tmp.style.opacity = '0';
      document.body.appendChild(tmp);
      tmp.focus();
      tmp.select();
      try {
        document.execCommand('copy');
        showToast('Invite link copied!', 'success');
      } catch (_) {
        showToast('Copy: ' + url, 'info', 8000);
      }
      document.body.removeChild(tmp);
    }
  });

  document.getElementById('btn-toggle-history-float').addEventListener('click', toggleHistorySidebar);
  document.getElementById('btn-collapse-history').addEventListener('click', () => setHistorySidebarExpanded(false));
  document.getElementById('btn-toggle-examples-float').addEventListener('click', toggleExamplesSidebar);
  document.getElementById('btn-collapse-examples').addEventListener('click', () => setExamplesSidebarExpanded(false));
  document.getElementById('btn-toggle-jira-prompt-float').addEventListener('click', toggleJiraPromptSidebar);
  document.getElementById('btn-collapse-jira-prompt').addEventListener('click', () => setJiraPromptSidebarExpanded(false));

  // Copy Rovo prompt button
  document.getElementById('jira-paste-input').addEventListener('paste', (e) => {
    // Allow the paste to land first, then parse
    setTimeout(() => {
      const raw = e.target.value;
      const parsed = parseJiraPromptResponse(raw);
      if (parsed) {
        applyCalcSelections(parsed);
        e.target.classList.add('is-applied');
        setTimeout(() => e.target.classList.remove('is-applied'), 2000);
      }
    }, 0);
  });

  document.getElementById('btn-copy-jira-prompt').addEventListener('click', () => {
    const textArea = document.getElementById('jira-prompt-text');
    const copyBtn = document.getElementById('btn-copy-jira-prompt');
    if (textArea) {
      textArea.select();
      textArea.setSelectionRange(0, 99999); // For mobile devices
      document.execCommand('copy');

      // Provide visual feedback
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    }
  });

  renderExamplesSidebar();

  document.getElementById('view-game').addEventListener('click', (e) => {
    const gameView = document.getElementById('view-game');
    const historyOpen = gameView.classList.contains('history-open');
    const examplesOpen = gameView.classList.contains('examples-open');
    const jiraPromptOpen = gameView.classList.contains('jira-prompt-open');
    if (!historyOpen && !examplesOpen && !jiraPromptOpen) return;

    const sidebar = document.getElementById('history-sidebar');
    const fab = document.getElementById('btn-toggle-history-float');
    const examplesSidebar = document.getElementById('examples-sidebar');
    const examplesFab = document.getElementById('btn-toggle-examples-float');
    const jiraPromptSidebar = document.getElementById('jira-prompt-sidebar');
    const jiraPromptFab = document.getElementById('btn-toggle-jira-prompt-float');

    if (historyOpen && !sidebar.contains(e.target) && !fab.contains(e.target)) {
      setHistorySidebarExpanded(false);
    }

    if (examplesOpen && !examplesSidebar.contains(e.target) && !examplesFab.contains(e.target)) {
      setExamplesSidebarExpanded(false);
    }

    if (jiraPromptOpen && !jiraPromptSidebar.contains(e.target) && !jiraPromptFab.contains(e.target)) {
      setJiraPromptSidebarExpanded(false);
    }
  });

  // ---- Calculator ----
  setupCalcButtons();
  syncCalcLabelWidth();
  setCalcDetailsExpanded(false);

  document.getElementById('btn-vote-calc').addEventListener('click', () => {
    const sp = document.getElementById('btn-vote-calc').dataset.sp;
    if (!sp) return;
    castVote(sp);
    showToast(`Voted ${sp} SP`, 'success');
  });

  document.getElementById('btn-toggle-calc-details').addEventListener('click', () => {
    const isExpanded = document.getElementById('btn-toggle-calc-details').getAttribute('aria-expanded') === 'true';
    setCalcDetailsExpanded(!isExpanded);
  });

  window.addEventListener('resize', () => {
    if (document.getElementById('view-game')?.classList.contains('active')) {
      syncCalcLabelWidth();
    }
  });

  // ResizeObserver keeps buttons adaptive whenever the calc-inputs element
  // changes size (window resize, panel open/close, etc.)
  const calcInputsEl = document.querySelector('.calc-inputs');
  if (calcInputsEl && typeof ResizeObserver !== 'undefined') {
    let _calcResizeTimer = null;
    new ResizeObserver(() => {
      if (document.getElementById('view-game')?.classList.contains('active')) {
        clearTimeout(_calcResizeTimer);
        _calcResizeTimer = setTimeout(syncCalcLabelWidth, 60);
      }
    }).observe(calcInputsEl);
  }

  // ---- Story Edit ----
  document.getElementById('btn-edit-story').addEventListener('click', () => {
    openStoryModal();
  });

  document.getElementById('btn-story-cancel').addEventListener('click', () => {
    document.getElementById('modal-story').setAttribute('hidden', '');
  });

  document.getElementById('btn-story-save').addEventListener('click', async () => {
    await setStory(document.getElementById('story-input').value.trim());
    document.getElementById('modal-story').setAttribute('hidden', '');
  });

  document.getElementById('story-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-story-save').click();
    if (e.key === 'Escape') document.getElementById('btn-story-cancel').click();
  });

  // Close modal on backdrop click
  document.getElementById('modal-story').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-story')) {
      document.getElementById('modal-story').setAttribute('hidden', '');
    }
  });

  // ---- Reveal / Next Story ----
  document.getElementById('btn-reveal').addEventListener('click', revealVotes);
  document.getElementById('btn-next-story').addEventListener('click', () => {
    document.getElementById('next-story-input').value = '';
    document.getElementById('modal-next-story').removeAttribute('hidden');
    document.getElementById('next-story-input').focus();
  });

  document.getElementById('btn-next-story-cancel').addEventListener('click', () => {
    document.getElementById('modal-next-story').setAttribute('hidden', '');
  });

  document.getElementById('btn-next-story-start').addEventListener('click', async () => {
    const storyName = document.getElementById('next-story-input').value.trim();
    if (!storyName) {
      showToast('Story name is required', 'error');
      return;
    }

    await nextStory(storyName);
    document.getElementById('modal-next-story').setAttribute('hidden', '');
    // Reset immediately for the moderator — don't wait for poller tick
    resetCalculatorSelectionsToDefault();
    updateCalcOutput();
  });

  document.getElementById('next-story-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-next-story-start').click();
    if (e.key === 'Escape') document.getElementById('btn-next-story-cancel').click();
  });

  // Close modal on backdrop click
  document.getElementById('modal-next-story').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-next-story')) {
      document.getElementById('modal-next-story').setAttribute('hidden', '');
    }
  });

  // ---- Theme ----
  document.getElementById('btn-toggle-theme').addEventListener('click', toggleTheme);
  document.getElementById('btn-toggle-theme-game').addEventListener('click', toggleTheme);

  // ---- Browser back ----
  window.addEventListener('popstate', () => {
    if (!new URLSearchParams(window.location.search).get('session')) leaveGame();
  });

  // ---- Persist name ----
  ['create-name-input', 'join-name-input'].forEach((id) => {
    document.getElementById(id).addEventListener('input', (e) => {
      localStorage.setItem('pp_username', e.target.value.trim());
    });
  });
}

// ---- Router ------------------------------------------------

async function router() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session');

  if (sessionId) {
    const storedName = localStorage.getItem('pp_username');
    if (storedName) {
      try {
        await joinSession(sessionId, storedName);
        await enterGame(sessionId);
        return;
      } catch (_) {
        // Session gone; fall through to home
        history.replaceState({}, '', window.location.pathname);
      }
    } else {
      // Pre-fill the join form
      document.getElementById('join-id-input').value = sessionId;
      document.getElementById('join-name-input').focus();
    }
  }

  showView('home');
}

// ---- Boot --------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  console.info(
    '[Planning Poker] Ably key injection:',
    window.__ABLY_API_KEY__ ? 'present' : 'missing',
    '| config key:',
    getMaskedAblyKey((ABLY_CONFIG && ABLY_CONFIG.apiKey) || '')
  );

  // Realtime mode priority: Ably -> Demo
  const ablyOk = tryInitAbly();
  state.dbMode = ablyOk ? 'ably' : 'demo';
  console.info('[Planning Poker] Runtime mode:', state.dbMode);
  if (state.dbMode === 'demo') initDemoMode();

  // Theme
  const saved = localStorage.getItem('pp_theme') || 'dark';
  applyTheme(saved);

  // Pre-fill name
  const storedName = localStorage.getItem('pp_username') || '';
  if (storedName) {
    document.getElementById('create-name-input').value = storedName;
    document.getElementById('join-name-input').value = storedName;
  }

  setupEventListeners();
  router();

  // BE mode badge
  // if (state.dbMode === 'demo') {
  //   const badge = el('div', 'demo-mode-badge', '🔓 Demo Mode');
  //   badge.title = 'Multi-tab sync works locally. Configure ably-config.js for cross-location realtime.';
  //   document.body.appendChild(badge);
  // } else if (state.dbMode === 'ably') {
  //   const badge = el('div', 'demo-mode-badge', '⚡ Ably Realtime');
  //   badge.title = 'Cross-location realtime sync via Ably. Session state expires automatically.';
  //   document.body.appendChild(badge);
  // }
});
