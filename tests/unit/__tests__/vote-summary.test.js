// __tests__/vote-summary.test.js — Unit tests for vote aggregation and session state logic

const {
  summarizeVotes,
  getConsensusFinalDecision,
  hasFinalDecision,
  canStartNextStory,
} = require('../../../src/js/app-exports.js');

// ---- summarizeVotes ----------------------------------------

describe('summarizeVotes', () => {
  test('returns empty summary for no participants', () => {
    const result = summarizeVotes({});
    expect(result.avg).toBeNull();
    expect(result.isConsensus).toBe(false);
    expect(result.distinctNumericVotes).toBe(0);
    expect(result.nearest).toBeNull();
    expect(result.entries).toEqual([]);
  });

  test('returns empty summary for null participants', () => {
    const result = summarizeVotes(null);
    expect(result.avg).toBeNull();
    expect(result.entries).toEqual([]);
  });

  test('ignores participants who have not voted', () => {
    const participants = {
      u1: { name: 'Alice', vote: null, hasVoted: false, joinedAt: 1 },
      u2: { name: 'Bob', vote: undefined, hasVoted: false, joinedAt: 2 },
    };
    const result = summarizeVotes(participants);
    expect(result.avg).toBeNull();
    expect(result.isConsensus).toBe(false);
  });

  test('correctly averages two numeric votes', () => {
    const participants = {
      u1: { vote: '5', hasVoted: true, joinedAt: 1 },
      u2: { vote: '3', hasVoted: true, joinedAt: 2 },
    };
    const result = summarizeVotes(participants);
    expect(result.avg).toBe(4);
    expect(result.isConsensus).toBe(false);
    expect(result.distinctNumericVotes).toBe(2);
  });

  test('detects consensus when all numeric votes are equal', () => {
    const participants = {
      u1: { vote: '8', hasVoted: true, joinedAt: 1 },
      u2: { vote: '8', hasVoted: true, joinedAt: 2 },
      u3: { vote: '8', hasVoted: true, joinedAt: 3 },
    };
    const result = summarizeVotes(participants);
    expect(result.isConsensus).toBe(true);
    expect(result.avg).toBe(8);
    expect(result.nearest).toBe(8);
  });

  test('ignores non-numeric votes (? and ☕) in average', () => {
    const participants = {
      u1: { vote: '5', hasVoted: true, joinedAt: 1 },
      u2: { vote: '?', hasVoted: true, joinedAt: 2 },
      u3: { vote: '☕', hasVoted: true, joinedAt: 3 },
    };
    const result = summarizeVotes(participants);
    expect(result.avg).toBe(5); // only u1's vote counts
    expect(result.isConsensus).toBe(true); // only one numeric vote
  });

  test('returns nearest Fibonacci value', () => {
    const participants = {
      u1: { vote: '6', hasVoted: true, joinedAt: 1 },
      u2: { vote: '7', hasVoted: true, joinedAt: 2 },
    };
    const result = summarizeVotes(participants);
    expect(result.avg).toBe(6.5); // avg of 6 and 7
    expect(result.nearest).toBe(8); // nearest Fibonacci to 6.5
  });

  test('sorts entries by joinedAt ascending', () => {
    const participants = {
      u3: { vote: '3', hasVoted: true, joinedAt: 300 },
      u1: { vote: '1', hasVoted: true, joinedAt: 100 },
      u2: { vote: '2', hasVoted: true, joinedAt: 200 },
    };
    const result = summarizeVotes(participants);
    const ids = result.entries.map(([id]) => id);
    expect(ids).toEqual(['u1', 'u2', 'u3']);
  });

  test('handles single participant with numeric vote', () => {
    const participants = {
      u1: { vote: '13', hasVoted: true, joinedAt: 1 },
    };
    const result = summarizeVotes(participants);
    expect(result.avg).toBe(13);
    expect(result.isConsensus).toBe(true);
    expect(result.nearest).toBe(13);
  });

  test('handles all non-numeric votes', () => {
    const participants = {
      u1: { vote: '?', hasVoted: true, joinedAt: 1 },
      u2: { vote: '☕', hasVoted: true, joinedAt: 2 },
    };
    const result = summarizeVotes(participants);
    expect(result.avg).toBeNull();
    expect(result.isConsensus).toBe(false);
    expect(result.nearest).toBeNull();
  });
});

// ---- getConsensusFinalDecision ------------------------------

describe('getConsensusFinalDecision', () => {
  test('returns null when no participants', () => {
    expect(getConsensusFinalDecision({})).toBeNull();
    expect(getConsensusFinalDecision(null)).toBeNull();
  });

  test('returns null when no numeric votes', () => {
    const participants = { u1: { vote: '?', hasVoted: true } };
    expect(getConsensusFinalDecision(participants)).toBeNull();
  });

  test('returns null when votes disagree', () => {
    const participants = {
      u1: { vote: '5', hasVoted: true },
      u2: { vote: '8', hasVoted: true },
    };
    expect(getConsensusFinalDecision(participants)).toBeNull();
  });

  test('returns formatted vote string when all numeric votes agree', () => {
    const participants = {
      u1: { vote: '8', hasVoted: true },
      u2: { vote: '8', hasVoted: true },
    };
    expect(getConsensusFinalDecision(participants)).toBe('8');
  });

  test('returns formatted decimal when consensus is a float', () => {
    // Fractional votes are unusual but should format cleanly
    const participants = {
      u1: { vote: '0.5', hasVoted: true },
      u2: { vote: '0.5', hasVoted: true },
    };
    expect(getConsensusFinalDecision(participants)).toBe('0.5');
  });

  test('ignores non-numeric votes when determining consensus', () => {
    // One numeric vote → consensus (only one distinct numeric value)
    const participants = {
      u1: { vote: '5', hasVoted: true },
      u2: { vote: '?', hasVoted: true },
    };
    expect(getConsensusFinalDecision(participants)).toBe('5');
  });
});

// ---- hasFinalDecision --------------------------------------

describe('hasFinalDecision', () => {
  test('returns false for null session', () => {
    expect(hasFinalDecision(null)).toBe(false);
  });

  test('returns false when finalDecision is null', () => {
    expect(hasFinalDecision({ finalDecision: null })).toBe(false);
  });

  test('returns false when finalDecision is undefined', () => {
    expect(hasFinalDecision({ finalDecision: undefined })).toBe(false);
    expect(hasFinalDecision({})).toBe(false);
  });

  test('returns true when finalDecision is a number', () => {
    expect(hasFinalDecision({ finalDecision: 8 })).toBe(true);
  });

  test('returns true when finalDecision is a string', () => {
    expect(hasFinalDecision({ finalDecision: '13' })).toBe(true);
  });

  test('returns true when finalDecision is 0', () => {
    // 0 is a valid decision value (e.g. 0-point story)
    expect(hasFinalDecision({ finalDecision: 0 })).toBe(true);
  });
});

// ---- canStartNextStory -------------------------------------

describe('canStartNextStory', () => {
  test('returns true for null session', () => {
    expect(canStartNextStory(null)).toBe(true);
  });

  test('returns true when status is voting', () => {
    expect(canStartNextStory({ status: 'voting', finalDecision: null })).toBe(true);
  });

  test('returns false when status is revealed and no final decision', () => {
    expect(canStartNextStory({ status: 'revealed', finalDecision: null })).toBe(false);
    expect(canStartNextStory({ status: 'revealed' })).toBe(false);
  });

  test('returns true when status is revealed and final decision is set', () => {
    expect(canStartNextStory({ status: 'revealed', finalDecision: 8 })).toBe(true);
    expect(canStartNextStory({ status: 'revealed', finalDecision: '5' })).toBe(true);
  });

  test('returns true when status is revealed and finalDecision is 0', () => {
    expect(canStartNextStory({ status: 'revealed', finalDecision: 0 })).toBe(true);
  });
});
