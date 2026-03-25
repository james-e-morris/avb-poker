// __tests__/jira-prompt.test.js - Unit tests for Jira AI Prompt feature

const {
  parseJiraPromptResponse,
  setJiraPromptSidebarExpanded,
  toggleJiraPromptSidebar,
} = require('../../../src/js/app-exports.js');

// ============================================================
// parseJiraPromptResponse
// ============================================================

describe('parseJiraPromptResponse', () => {
  const validResponse = `
Size: 5
Complexity: Medium
Uncertainty: Low
Cognitive Load: Medium
Dependencies: Medium
Risk: Medium
Suggested Story Points: 8
`.trim();

  describe('valid inputs', () => {
    test('parses a well-formed Rovo response', () => {
      const result = parseJiraPromptResponse(validResponse);
      expect(result).toEqual({
        size: 5,
        complexity: 2,
        uncertainty: 1,
        cognitive: 2,
        deps: 2,
        risk: 2,
      });
    });

    test('parses all-Low ratings with size 1', () => {
      const text = `Size: 1\nComplexity: Low\nUncertainty: Low\nCognitive Load: Low\nDependencies: Low\nRisk: Low\nSuggested Story Points: 1`;
      const result = parseJiraPromptResponse(text);
      expect(result).toEqual({ size: 1, complexity: 1, uncertainty: 1, cognitive: 1, deps: 1, risk: 1 });
    });

    test('parses all-High ratings with size 8', () => {
      const text = `Size: 8\nComplexity: High\nUncertainty: High\nCognitive Load: High\nDependencies: High\nRisk: High\nSuggested Story Points: 89`;
      const result = parseJiraPromptResponse(text);
      expect(result).toEqual({ size: 8, complexity: 3, uncertainty: 3, cognitive: 3, deps: 3, risk: 3 });
    });

    test('parses size 2', () => {
      const text = `Size: 2\nComplexity: Low\nUncertainty: Low\nCognitive Load: Low\nDependencies: Low\nRisk: Low`;
      expect(parseJiraPromptResponse(text).size).toBe(2);
    });

    test('parses size 3', () => {
      const text = `Size: 3\nComplexity: Low\nUncertainty: Low\nCognitive Load: Low\nDependencies: Low\nRisk: Low`;
      expect(parseJiraPromptResponse(text).size).toBe(3);
    });

    test('parses Medium level (value 2)', () => {
      const text = `Size: 1\nComplexity: Medium\nUncertainty: Medium\nCognitive Load: Medium\nDependencies: Medium\nRisk: Medium`;
      const result = parseJiraPromptResponse(text);
      expect(result.complexity).toBe(2);
      expect(result.uncertainty).toBe(2);
      expect(result.cognitive).toBe(2);
      expect(result.deps).toBe(2);
      expect(result.risk).toBe(2);
    });

    test('parses High level (value 3)', () => {
      const text = `Size: 1\nComplexity: High\nUncertainty: High\nCognitive Load: High\nDependencies: High\nRisk: High`;
      const result = parseJiraPromptResponse(text);
      expect(result.complexity).toBe(3);
      expect(result.uncertainty).toBe(3);
      expect(result.cognitive).toBe(3);
      expect(result.deps).toBe(3);
      expect(result.risk).toBe(3);
    });

    test('is case-insensitive for level values', () => {
      const text = `Size: 5\nComplexity: LOW\nUncertainty: MEDIUM\nCognitive Load: HIGH\nDependencies: low\nRisk: medium`;
      const result = parseJiraPromptResponse(text);
      expect(result).not.toBeNull();
      expect(result.complexity).toBe(1);
      expect(result.uncertainty).toBe(2);
      expect(result.cognitive).toBe(3);
      expect(result.deps).toBe(1);
      expect(result.risk).toBe(2);
    });

    test('trims whitespace from parsed values', () => {
      const text = `Size:  5  \nComplexity:   Medium   \nUncertainty: Low\nCognitive Load: Medium\nDependencies: Medium\nRisk: Medium`;
      const result = parseJiraPromptResponse(text);
      expect(result).not.toBeNull();
      expect(result.size).toBe(5);
      expect(result.complexity).toBe(2);
    });

    test('works with Windows-style CRLF line endings', () => {
      const text = `Size: 3\r\nComplexity: Low\r\nUncertainty: Low\r\nCognitive Load: Low\r\nDependencies: Low\r\nRisk: Low`;
      const result = parseJiraPromptResponse(text);
      expect(result).not.toBeNull();
      expect(result.size).toBe(3);
    });

    test('works when Suggested Story Points line is present', () => {
      const result = parseJiraPromptResponse(validResponse);
      expect(result).not.toBeNull();
    });

    test('works without Suggested Story Points line', () => {
      const text = `Size: 5\nComplexity: Medium\nUncertainty: Low\nCognitive Load: Medium\nDependencies: Medium\nRisk: Medium`;
      expect(parseJiraPromptResponse(text)).not.toBeNull();
    });

    test('works when response contains extra prose before/after the data block', () => {
      const text = `Here is my analysis of the ticket:\n\nSize: 5\nComplexity: Medium\nUncertainty: Low\nCognitive Load: Medium\nDependencies: Medium\nRisk: Medium\nSuggested Story Points: 8\n\nThis is a medium complexity story.`;
      const result = parseJiraPromptResponse(text);
      expect(result).not.toBeNull();
      expect(result.size).toBe(5);
    });
  });

  describe('missing fields — returns null', () => {
    test('returns null when Size is missing', () => {
      const text = `Complexity: Medium\nUncertainty: Low\nCognitive Load: Medium\nDependencies: Medium\nRisk: Medium`;
      expect(parseJiraPromptResponse(text)).toBeNull();
    });

    test('returns null when Complexity is missing', () => {
      const text = `Size: 5\nUncertainty: Low\nCognitive Load: Medium\nDependencies: Medium\nRisk: Medium`;
      expect(parseJiraPromptResponse(text)).toBeNull();
    });

    test('returns null when Uncertainty is missing', () => {
      const text = `Size: 5\nComplexity: Medium\nCognitive Load: Medium\nDependencies: Medium\nRisk: Medium`;
      expect(parseJiraPromptResponse(text)).toBeNull();
    });

    test('returns null when Cognitive Load is missing', () => {
      const text = `Size: 5\nComplexity: Medium\nUncertainty: Low\nDependencies: Medium\nRisk: Medium`;
      expect(parseJiraPromptResponse(text)).toBeNull();
    });

    test('returns null when Dependencies is missing', () => {
      const text = `Size: 5\nComplexity: Medium\nUncertainty: Low\nCognitive Load: Medium\nRisk: Medium`;
      expect(parseJiraPromptResponse(text)).toBeNull();
    });

    test('returns null when Risk is missing', () => {
      const text = `Size: 5\nComplexity: Medium\nUncertainty: Low\nCognitive Load: Medium\nDependencies: Medium`;
      expect(parseJiraPromptResponse(text)).toBeNull();
    });

    test('returns null for empty string', () => {
      expect(parseJiraPromptResponse('')).toBeNull();
    });

    test('returns null for whitespace-only string', () => {
      expect(parseJiraPromptResponse('   \n\n  ')).toBeNull();
    });
  });

  describe('invalid field values — returns null', () => {
    test('returns null for size 0 (not a valid Fibonacci size)', () => {
      const text = `Size: 0\nComplexity: Low\nUncertainty: Low\nCognitive Load: Low\nDependencies: Low\nRisk: Low`;
      expect(parseJiraPromptResponse(text)).toBeNull();
    });

    test('returns null for size 4 (not in allowed set)', () => {
      const text = `Size: 4\nComplexity: Low\nUncertainty: Low\nCognitive Load: Low\nDependencies: Low\nRisk: Low`;
      expect(parseJiraPromptResponse(text)).toBeNull();
    });

    test('returns null for size 6 (not in allowed set)', () => {
      const text = `Size: 6\nComplexity: Low\nUncertainty: Low\nCognitive Load: Low\nDependencies: Low\nRisk: Low`;
      expect(parseJiraPromptResponse(text)).toBeNull();
    });

    test('returns null for size 7 (not in allowed set)', () => {
      const text = `Size: 7\nComplexity: Low\nUncertainty: Low\nCognitive Load: Low\nDependencies: Low\nRisk: Low`;
      expect(parseJiraPromptResponse(text)).toBeNull();
    });

    test('returns null when size is non-numeric text', () => {
      const text = `Size: Large\nComplexity: Low\nUncertainty: Low\nCognitive Load: Low\nDependencies: Low\nRisk: Low`;
      expect(parseJiraPromptResponse(text)).toBeNull();
    });

    test('returns null for unknown complexity level', () => {
      const text = `Size: 5\nComplexity: Unknown\nUncertainty: Low\nCognitive Load: Medium\nDependencies: Medium\nRisk: Medium`;
      expect(parseJiraPromptResponse(text)).toBeNull();
    });

    test('returns null for unknown uncertainty level', () => {
      const text = `Size: 5\nComplexity: Medium\nUncertainty: Very High\nCognitive Load: Medium\nDependencies: Medium\nRisk: Medium`;
      expect(parseJiraPromptResponse(text)).toBeNull();
    });

    test('returns null for unknown cognitive load level', () => {
      const text = `Size: 5\nComplexity: Medium\nUncertainty: Low\nCognitive Load: Extreme\nDependencies: Medium\nRisk: Medium`;
      expect(parseJiraPromptResponse(text)).toBeNull();
    });

    test('returns null for unknown dependencies level', () => {
      const text = `Size: 5\nComplexity: Medium\nUncertainty: Low\nCognitive Load: Medium\nDependencies: Critical\nRisk: Medium`;
      expect(parseJiraPromptResponse(text)).toBeNull();
    });

    test('returns null for unknown risk level', () => {
      const text = `Size: 5\nComplexity: Medium\nUncertainty: Low\nCognitive Load: Medium\nDependencies: Medium\nRisk: Catastrophic`;
      expect(parseJiraPromptResponse(text)).toBeNull();
    });
  });

  describe('all valid size values', () => {
    test.each([1, 2, 3, 5, 8])('correctly parses size %i', (size) => {
      const text = `Size: ${size}\nComplexity: Low\nUncertainty: Low\nCognitive Load: Low\nDependencies: Low\nRisk: Low`;
      const result = parseJiraPromptResponse(text);
      expect(result).not.toBeNull();
      expect(result.size).toBe(size);
    });
  });

  describe('all valid level-to-value mappings', () => {
    test.each([
      ['Low', 1],
      ['Medium', 2],
      ['High', 3],
    ])('maps "%s" to %i', (level, expected) => {
      const text = `Size: 1\nComplexity: ${level}\nUncertainty: ${level}\nCognitive Load: ${level}\nDependencies: ${level}\nRisk: ${level}`;
      const result = parseJiraPromptResponse(text);
      expect(result).not.toBeNull();
      expect(result.complexity).toBe(expected);
      expect(result.uncertainty).toBe(expected);
      expect(result.cognitive).toBe(expected);
      expect(result.deps).toBe(expected);
      expect(result.risk).toBe(expected);
    });
  });

  describe('output object shape', () => {
    test('returned object has exactly the correct keys', () => {
      const result = parseJiraPromptResponse(validResponse);
      expect(Object.keys(result).sort()).toEqual(['cognitive', 'complexity', 'deps', 'risk', 'size', 'uncertainty']);
    });

    test('all returned values are numbers', () => {
      const result = parseJiraPromptResponse(validResponse);
      Object.values(result).forEach((v) => expect(typeof v).toBe('number'));
    });
  });
});

// ============================================================
// setJiraPromptSidebarExpanded
// ============================================================

describe('setJiraPromptSidebarExpanded', () => {
  function buildSidebarDOM() {
    document.body.innerHTML = `
      <div id="view-game"></div>
      <aside id="jira-prompt-sidebar" class="is-collapsed"></aside>
      <button id="btn-toggle-jira-prompt-float" aria-expanded="false"></button>
    `;
  }

  beforeEach(buildSidebarDOM);

  test('expands sidebar: removes is-collapsed, hides button, sets aria-expanded=true', () => {
    setJiraPromptSidebarExpanded(true);

    const sidebar = document.getElementById('jira-prompt-sidebar');
    const btn = document.getElementById('btn-toggle-jira-prompt-float');
    const view = document.getElementById('view-game');

    expect(sidebar.classList.contains('is-collapsed')).toBe(false);
    expect(btn.hidden).toBe(true);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(view.classList.contains('jira-prompt-open')).toBe(true);
  });

  test('collapses sidebar: adds is-collapsed, shows button, sets aria-expanded=false', () => {
    // Open first
    setJiraPromptSidebarExpanded(true);
    // Then close
    setJiraPromptSidebarExpanded(false);

    const sidebar = document.getElementById('jira-prompt-sidebar');
    const btn = document.getElementById('btn-toggle-jira-prompt-float');
    const view = document.getElementById('view-game');

    expect(sidebar.classList.contains('is-collapsed')).toBe(true);
    expect(btn.hidden).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(view.classList.contains('jira-prompt-open')).toBe(false);
  });

  test('does nothing when view-game is missing', () => {
    document.body.innerHTML = `
      <aside id="jira-prompt-sidebar" class="is-collapsed"></aside>
      <button id="btn-toggle-jira-prompt-float" aria-expanded="false"></button>
    `;
    expect(() => setJiraPromptSidebarExpanded(true)).not.toThrow();
    expect(document.getElementById('jira-prompt-sidebar').classList.contains('is-collapsed')).toBe(true);
  });

  test('does nothing when sidebar is missing', () => {
    document.body.innerHTML = `
      <div id="view-game"></div>
      <button id="btn-toggle-jira-prompt-float" aria-expanded="false"></button>
    `;
    expect(() => setJiraPromptSidebarExpanded(true)).not.toThrow();
    expect(document.getElementById('view-game').classList.contains('jira-prompt-open')).toBe(false);
  });

  test('does nothing when toggle button is missing', () => {
    document.body.innerHTML = `
      <div id="view-game"></div>
      <aside id="jira-prompt-sidebar" class="is-collapsed"></aside>
    `;
    expect(() => setJiraPromptSidebarExpanded(true)).not.toThrow();
    expect(document.getElementById('jira-prompt-sidebar').classList.contains('is-collapsed')).toBe(true);
  });

  test('treats truthy non-boolean as expanded', () => {
    setJiraPromptSidebarExpanded(1);
    expect(document.getElementById('view-game').classList.contains('jira-prompt-open')).toBe(true);
  });

  test('treats falsy non-boolean as collapsed', () => {
    setJiraPromptSidebarExpanded(true);
    setJiraPromptSidebarExpanded(0);
    expect(document.getElementById('view-game').classList.contains('jira-prompt-open')).toBe(false);
  });

  test('idempotent: expanding an already-expanded sidebar stays expanded', () => {
    setJiraPromptSidebarExpanded(true);
    setJiraPromptSidebarExpanded(true);
    expect(document.getElementById('jira-prompt-sidebar').classList.contains('is-collapsed')).toBe(false);
    expect(document.getElementById('view-game').classList.contains('jira-prompt-open')).toBe(true);
  });

  test('idempotent: collapsing an already-collapsed sidebar stays collapsed', () => {
    setJiraPromptSidebarExpanded(false);
    setJiraPromptSidebarExpanded(false);
    expect(document.getElementById('jira-prompt-sidebar').classList.contains('is-collapsed')).toBe(true);
    expect(document.getElementById('view-game').classList.contains('jira-prompt-open')).toBe(false);
  });
});

// ============================================================
// toggleJiraPromptSidebar
// ============================================================

describe('toggleJiraPromptSidebar', () => {
  function buildSidebarDOM() {
    document.body.innerHTML = `
      <div id="view-game"></div>
      <aside id="jira-prompt-sidebar" class="is-collapsed"></aside>
      <button id="btn-toggle-jira-prompt-float" aria-expanded="false"></button>
    `;
  }

  beforeEach(buildSidebarDOM);

  test('toggles from closed to open', () => {
    toggleJiraPromptSidebar();
    const view = document.getElementById('view-game');
    expect(view.classList.contains('jira-prompt-open')).toBe(true);
    expect(document.getElementById('jira-prompt-sidebar').classList.contains('is-collapsed')).toBe(false);
  });

  test('toggles from open to closed', () => {
    toggleJiraPromptSidebar(); // open
    toggleJiraPromptSidebar(); // close
    const view = document.getElementById('view-game');
    expect(view.classList.contains('jira-prompt-open')).toBe(false);
    expect(document.getElementById('jira-prompt-sidebar').classList.contains('is-collapsed')).toBe(true);
  });

  test('does nothing when view-game element is missing', () => {
    document.body.innerHTML = `
      <aside id="jira-prompt-sidebar" class="is-collapsed"></aside>
      <button id="btn-toggle-jira-prompt-float" aria-expanded="false"></button>
    `;
    expect(() => toggleJiraPromptSidebar()).not.toThrow();
  });

  test('calls setJiraPromptSidebarExpanded with current inverse state', () => {
    const view = document.getElementById('view-game');

    // Initially closed — toggle should open
    expect(view.classList.contains('jira-prompt-open')).toBe(false);
    toggleJiraPromptSidebar();
    expect(view.classList.contains('jira-prompt-open')).toBe(true);

    // Now open — toggle should close
    toggleJiraPromptSidebar();
    expect(view.classList.contains('jira-prompt-open')).toBe(false);
  });

  test('multiple toggles cycle correctly', () => {
    const view = document.getElementById('view-game');
    for (let i = 0; i < 5; i++) {
      toggleJiraPromptSidebar();
      expect(view.classList.contains('jira-prompt-open')).toBe(true);
      toggleJiraPromptSidebar();
      expect(view.classList.contains('jira-prompt-open')).toBe(false);
    }
  });
});
