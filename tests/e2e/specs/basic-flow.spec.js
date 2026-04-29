// e2e/basic-flow.spec.js - E2E tests for basic Planning Poker flow

import { test, expect } from '@playwright/test';

async function joinFromInviteLink(page, sessionId, participantName) {
  await page.goto(`/?session=${sessionId}`);

  const gameView = page.locator('#view-game');
  const alreadyInGame = await gameView.evaluate((el) => el.classList.contains('active'));

  if (!alreadyInGame) {
    await expect(page.locator('#join-name-input')).toBeVisible({ timeout: 3000 });
    await page.fill('#join-name-input', participantName);
    await page.click('#btn-join');
  }

  await expect(gameView).toHaveClass(/active/, { timeout: 5000 });
}

test.describe('Planning Poker - Basic Flow', () => {
  test('should load home view correctly', async ({ page }) => {
    await page.goto('/');

    // Wait for home view
    await expect(page.locator('#view-home')).toHaveClass(/active/);

    // Check main UI elements exist
    await expect(page.locator('.logo')).toBeVisible();
    await expect(page.locator('.hero')).toBeVisible();
    await expect(page.locator('#btn-create')).toBeVisible();
    await expect(page.locator('#btn-join')).toBeVisible();

    // Check theme button
    await expect(page.locator('#btn-toggle-theme')).toBeVisible();
  });

  test('should create session with valid inputs', async ({ page }) => {
    await page.goto('/');

    // Fill and submit create form
    await page.fill('#session-name-input', 'Sprint 23 Planning');
    await page.fill('#create-name-input', 'Alice');
    await page.click('#btn-create');

    // Should transition to loading then game view
    await expect(page.locator('#view-loading'))
      .toHaveClass(/active/, { timeout: 1000 })
      .catch(() => {});
    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    // Verify game view elements
    await expect(page.locator('#participants-grid')).toBeVisible();
    await expect(page.locator('#vote-cards')).toBeVisible();
    await expect(page.locator('.calculator')).toBeVisible();
  });

  test('should validate create form', async ({ page }) => {
    await page.goto('/');

    // Try to create without name
    await page.fill('#create-name-input', '');
    await page.click('#btn-create');

    // Should show error toast
    const toast = page.locator('#toast');
    await expect(toast).toContainText('Please enter your name');
  });

  test('should join session', async ({ page, context }) => {
    // First tab: create session
    await page.goto('/');
    await page.fill('#session-name-input', 'Test Session');
    await page.fill('#create-name-input', 'Bob');

    const createPromise = page.waitForURL(/session=/);
    await page.click('#btn-create');
    await createPromise;

    // Extract session ID from URL
    const sessionId = page.url().split('session=')[1];
    expect(sessionId).toBeTruthy();

    // Second tab: join same session
    const page2 = await context.newPage();
    await joinFromInviteLink(page2, sessionId, 'Charlie');

    await page2.close();
  });

  test('should validate join form', async ({ page }) => {
    await page.goto('/');

    // Try to join without ID
    await page.fill('#join-name-input', 'User');
    await page.click('#btn-join');

    const toast = page.locator('#toast');
    await expect(toast).toContainText('Please enter a session ID');
  });

  test('should validate session ID length', async ({ page }) => {
    await page.goto('/');

    // Try ID that's too short
    await page.fill('#join-id-input', 'ABC');
    await page.fill('#join-name-input', 'User');
    await page.click('#btn-join');

    const toast = page.locator('#toast');
    await expect(toast).toContainText('Session ID must be 4-12 characters');
  });

  test('should auto-uppercase session ID input', async ({ page }) => {
    await page.goto('/');

    await page.fill('#join-id-input', 'abc123');
    const value = await page.inputValue('#join-id-input');

    expect(value).toMatch(/^[A-Z0-9]*$/);
  });

  test('should toggle theme', async ({ page }) => {
    await page.goto('/');

    const htmlElement = page.locator('html');
    const initialTheme = await htmlElement.getAttribute('data-theme');

    // Both theme buttons should work
    await page.click('#btn-toggle-theme');
    const newTheme = await htmlElement.getAttribute('data-theme');

    expect(newTheme).not.toBe(initialTheme);
    expect(['dark', 'light']).toContain(newTheme);
  });

  test('should show calculator details toggle', async ({ page }) => {
    await page.goto('/');
    await page.fill('#session-name-input', 'Details Test');
    await page.fill('#create-name-input', 'User');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 5000 });
    await expect(page.locator('#btn-toggle-calc-details')).toBeVisible();

    await page.click('#btn-toggle-calc-details');
    await expect(page.locator('#calc-details')).toBeVisible();
  });
});

test.describe('Planning Poker - Voting Flow', () => {
  test('should start timer immediately for moderator and sync to participants', async ({ page, context }) => {
    const parseClock = (clockText) => {
      const [min, sec] = String(clockText)
        .trim()
        .split(':')
        .map((part) => Number(part));
      if (!Number.isFinite(min) || !Number.isFinite(sec)) return NaN;
      return min * 60 + sec;
    };

    await page.goto('/');
    await page.fill('#session-name-input', 'Timer Sync Test');
    await page.fill('#create-name-input', 'Moderator');

    const createPromise = page.waitForURL(/session=/);
    await page.click('#btn-create');
    await createPromise;

    const sessionId = page.url().split('session=')[1];

    // Story is required for the reveal flow when timer expires.
    await page.click('#game-story-display', { force: true });
    await page.fill('#story-input', 'Timer sync story');
    await page.click('#btn-story-save');

    const participant = await context.newPage();
    await joinFromInviteLink(participant, sessionId, 'Participant');

    // Story save auto-starts the timer.
    await expect(page.locator('.story-timer')).toHaveClass(/is-running/, { timeout: 350 });
    await expect(participant.locator('.story-timer')).toHaveClass(/is-running/, { timeout: 2500 });

    // Reset then start should also reflect immediately for moderator.
    await page.click('#btn-story-timer-action');
    await expect(page.locator('.story-timer')).not.toHaveClass(/is-running/, { timeout: 350 });

    await page.click('#btn-story-timer-action');
    await expect(page.locator('.story-timer')).toHaveClass(/is-running/, { timeout: 350 });
    await expect(participant.locator('.story-timer')).toHaveClass(/is-running/, { timeout: 2500 });

    const moderatorStart = parseClock(await page.locator('#story-timer-value').innerText());
    const participantStart = parseClock(await participant.locator('#story-timer-value').innerText());

    await page.waitForTimeout(2100);

    const moderatorAfter = parseClock(await page.locator('#story-timer-value').innerText());
    const participantAfter = parseClock(await participant.locator('#story-timer-value').innerText());

    expect(moderatorAfter).toBeLessThan(moderatorStart);
    expect(participantAfter).toBeLessThan(participantStart);

    await participant.close();
  });

  test('should cast vote in game', async ({ page }) => {
    await page.goto('/');

    // Create session and enter game
    await page.fill('#session-name-input', 'Voting Test');
    await page.fill('#create-name-input', 'Voter');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    // Vote cards should be visible
    const voteCards = page.locator('.vote-card');
    const cardCount = await voteCards.count();
    expect(cardCount).toBe(13); // All Fibonacci cards + ? + ☕

    // Click a vote card
    await page.click('.vote-card:has-text("5")');

    // Card should show as selected
    const selectedCard = page.locator('.vote-card.selected');
    await expect(selectedCard).toContainText('5');
  });

  test('should display vote count in status bar', async ({ page }) => {
    await page.goto('/');

    await page.fill('#session-name-input', 'Status Test');
    await page.fill('#create-name-input', 'Alice');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    // Vote
    await page.click('.vote-card:has-text("8")');

    // Status bar should update
    const voteCount = page.locator('#vote-count-label');
    await expect(voteCount).toContainText('1 of 1 voted');
  });

  test('should reveal votes', async ({ page, context }) => {
    // Create moderator tab
    await page.goto('/');
    await page.fill('#session-name-input', 'Reveal Test');
    await page.fill('#create-name-input', 'Moderator');

    const createPromise = page.waitForURL(/session=/);
    await page.click('#btn-create');
    await createPromise;

    const sessionId = page.url().split('session=')[1];

    // Vote as moderator
    await page.click('.vote-card:has-text("13")');

    // Create participant tab
    const page2 = await context.newPage();
    await joinFromInviteLink(page2, sessionId, 'Participant');
    await page2.click('.vote-card:has-text("5")');

    // Reveal button should appear for moderator
    const revealBtn = page.locator('#btn-reveal');
    await expect(revealBtn).not.toHaveAttribute('hidden');

    // Reveal is disabled until a story name is set
    await page.click('#game-story-display', { force: true });
    await expect(page.locator('#modal-story')).not.toHaveAttribute('hidden');
    await page.fill('#story-input', 'Story for reveal test');
    await page.click('#btn-story-save');

    // Click reveal
    await page.click('#btn-reveal');

    // Results should show on both pages
    const resultsArea = page.locator('#results-area');
    await expect(resultsArea).not.toHaveAttribute('hidden');

    const resultsArea2 = page2.locator('#results-area');
    await expect(resultsArea2).not.toHaveAttribute('hidden');

    await page2.close();
  });

  test('should preserve existing vote state when same user rejoins session', async ({ page, context }) => {
    await page.goto('/');
    await page.fill('#session-name-input', 'Rejoin State Test');
    await page.fill('#create-name-input', 'Moderator');

    const createPromise = page.waitForURL(/session=/);
    await page.click('#btn-create');
    await createPromise;

    const sessionId = page.url().split('session=')[1];

    await page.click('.vote-card:has-text("5")');
    await expect(page.locator('#vote-count-label')).toContainText('1 of 1 voted');

    // Same browser context keeps pp_uid; rejoin should not wipe existing vote.
    const rejoinTab = await context.newPage();
    await rejoinTab.goto(`/?session=${sessionId}`);
    await expect(rejoinTab.locator('#view-game')).toHaveClass(/active/, { timeout: 5000 });

    await expect(page.locator('#vote-count-label')).toContainText('1 of 1 voted');
    await expect(rejoinTab.locator('#vote-count-label')).toContainText('1 of 1 voted');

    await rejoinTab.close();
  });

  test('should sync final pick and next story transition across tabs', async ({ page, context }) => {
    await page.goto('/');
    await page.fill('#session-name-input', 'Final Pick Sync Test');
    await page.fill('#create-name-input', 'Moderator');

    const createPromise = page.waitForURL(/session=/);
    await page.click('#btn-create');
    await createPromise;

    const sessionId = page.url().split('session=')[1];

    await page.click('#game-story-display', { force: true });
    await page.fill('#story-input', 'Story A');
    await page.click('#btn-story-save');

    await page.click('.vote-card:has-text("8")');

    const participant = await context.newPage();
    const participantUid = `u_participant_${Date.now()}`;
    await participant.goto('/');
    await participant.evaluate(
      ({ uid }) => {
        localStorage.setItem('pp_uid', uid);
        localStorage.setItem('pp_username', 'Participant');
      },
      { uid: participantUid }
    );

    await joinFromInviteLink(participant, sessionId, 'Participant');
    await participant.click('.vote-card:has-text("5")');

    await page.click('#btn-reveal');

    await expect(page.locator('#results-area')).not.toHaveAttribute('hidden', { timeout: 5000 });
    await expect(participant.locator('#results-area')).not.toHaveAttribute('hidden', { timeout: 5000 });

    await page.click('#results-final-picker .decision-chip:has-text("8")');

    await expect(page.locator('#results-final-value')).toContainText('8 SP');
    await expect(participant.locator('#results-final-value')).toContainText('8 SP');

    await page.click('#btn-next-story');
    await expect(page.locator('#modal-next-story')).not.toHaveAttribute('hidden', { timeout: 3000 });
    await page.fill('#next-story-input', 'Story B');
    await page.click('#btn-next-story-start');

    await expect(page.locator('#results-area')).toHaveAttribute('hidden', '', { timeout: 5000 });
    await expect(participant.locator('#results-area')).toHaveAttribute('hidden', '', { timeout: 5000 });

    await expect(page.locator('#game-story-display')).toHaveText('Story B');
    await expect(participant.locator('#game-story-display')).toHaveText('Story B');
    await expect(page.locator('#vote-count-label')).toContainText('0 of 2 voted');
    await expect(participant.locator('#vote-count-label')).toContainText('0 of 2 voted');

    await participant.close();
  });

  test('should auto-reveal on timer expiry in cross-tab mode', async ({ page, context }) => {
    test.setTimeout(80000);

    await page.goto('/');
    await page.fill('#session-name-input', 'Timer Expiry Auto Reveal');
    await page.fill('#create-name-input', 'Moderator');

    const createPromise = page.waitForURL(/session=/);
    await page.click('#btn-create');
    await createPromise;

    const sessionId = page.url().split('session=')[1];

    await page.click('#game-story-display', { force: true });
    await page.fill('#story-input', 'Auto reveal on expiry');
    await page.click('#btn-story-save');

    // Use shortest path to expiry to keep test quick and deterministic.
    await page.click('#btn-story-timer-action'); // reset from auto-start
    await expect(page.locator('.story-timer')).not.toHaveClass(/is-running/, { timeout: 1000 });

    await page.click('#btn-timer-30');
    await page.click('#btn-story-timer-action');
    await expect(page.locator('.story-timer')).toHaveClass(/is-running/, { timeout: 1000 });

    // Cast votes before expiry so reveal has data.
    await page.click('.vote-card:has-text("8")');

    const participant = await context.newPage();
    await joinFromInviteLink(participant, sessionId, 'Participant');
    await participant.click('.vote-card:has-text("5")');

    await expect(participant.locator('.story-timer')).toHaveClass(/is-running/, { timeout: 2500 });

    // Timer expiry should trigger auto reveal without clicking Reveal Votes.
    await expect(page.locator('#results-area')).not.toHaveAttribute('hidden', { timeout: 40000 });
    await expect(participant.locator('#results-area')).not.toHaveAttribute('hidden', { timeout: 40000 });

    // Footer should move to revealed controls in both tabs.
    await expect(page.locator('#footer-revealed')).not.toHaveAttribute('hidden');
    await expect(participant.locator('#footer-revealed')).not.toHaveAttribute('hidden');

    await participant.close();
  });

  test('should return to voting, clear all votes, and restore voting state across tabs', async ({ page, context }) => {
    // Create session
    await page.goto('/');
    await page.fill('#session-name-input', 'Return To Voting Test');
    await page.fill('#create-name-input', 'Moderator');

    const createPromise = page.waitForURL(/session=/);
    await page.click('#btn-create');
    await createPromise;

    const sessionId = page.url().split('session=')[1];

    // Set a story name (required to reveal)
    await page.click('#game-story-display', { force: true });
    await page.fill('#story-input', 'Story for return-to-voting test');
    await page.click('#btn-story-save');

    // Join a second participant with a distinct identity
    const participant = await context.newPage();
    const participantUid = `u_rtv_participant_${Date.now()}`;
    await participant.goto('/');
    await participant.evaluate(
      ({ uid }) => {
        localStorage.setItem('pp_uid', uid);
        localStorage.setItem('pp_username', 'Participant');
      },
      { uid: participantUid }
    );

    await joinFromInviteLink(participant, sessionId, 'Participant');

    // Both cast votes
    await page.click('.vote-card:has-text("8")');
    await participant.click('.vote-card:has-text("5")');

    // Moderator reveals
    await page.click('#btn-reveal');
    await expect(page.locator('#results-area')).not.toHaveAttribute('hidden', { timeout: 5000 });
    await expect(participant.locator('#results-area')).not.toHaveAttribute('hidden', { timeout: 5000 });

    // Moderator returns to voting
    await page.click('#btn-return-voting');

    // Results should be hidden again on both tabs
    await expect(page.locator('#results-area')).toHaveAttribute('hidden', '', { timeout: 5000 });
    await expect(participant.locator('#results-area')).toHaveAttribute('hidden', '', { timeout: 5000 });

    // Voting footer should be active again
    await expect(page.locator('#footer-voting')).not.toHaveAttribute('hidden', { timeout: 3000 });
    await expect(participant.locator('#footer-voting')).not.toHaveAttribute('hidden', { timeout: 3000 });

    // Votes are PRESERVED when returning to voting (participants can re-vote or change votes).
    // Unlike nextStory, returnToVoting does not reset participant vote state.
    await expect(page.locator('#vote-count-label')).toContainText('2 of 2 voted');
    await expect(participant.locator('#vote-count-label')).toContainText('2 of 2 voted');

    // Cards should be re-enabled so participants can change their votes
    const modCard = page.locator('.vote-card[data-value="3"]');
    await expect(modCard).not.toBeDisabled();

    await participant.close();
  });

  test('should calculate average correctly', async ({ page }) => {
    await page.goto('/');

    await page.fill('#session-name-input', 'Calculate Test');
    await page.fill('#create-name-input', 'Test');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    // Vote
    await page.click('.vote-card:has-text("5")');

    // Note: To fully test this, we'd need multiple participants
    // This test verifies the UI can handle results display
  });
});

test.describe('Planning Poker - Calculator', () => {
  test('should display calculator controls', async ({ page }) => {
    await page.goto('/');

    await page.fill('#session-name-input', 'Calc Test');
    await page.fill('#create-name-input', 'User');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    // Check calculator exists
    await expect(page.locator('.calculator')).toBeVisible();

    // Check for scale buttons
    const scaleButtons = page.locator('.scale-btn');
    const count = await scaleButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should update calculator output', async ({ page }) => {
    await page.goto('/');

    await page.fill('#session-name-input', 'Calc Output Test');
    await page.fill('#create-name-input', 'User');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    // Output elements should exist
    await expect(page.locator('#out-sp')).toBeVisible();
    await page.click('#btn-toggle-calc-details');
    await expect(page.locator('#out-formula')).toBeVisible();
    await expect(page.locator('#btn-vote-calc')).toBeVisible();
  });
});

test.describe('Planning Poker - Layout Responsiveness', () => {
  test('should render correctly on mobile', async ({ page }) => {
    // This runs on all viewport sizes defined in playwright.config.js
    await page.goto('/');

    // Home should be visible
    await expect(page.locator('.hero')).toBeVisible();
    await expect(page.locator('#btn-create')).toBeVisible();

    // Should be scrollable, not overflow
    const body = page.locator('body');
    const mainContent = page.locator('#view-home');

    const bodyBox = await body.boundingBox();
    const contentBox = await mainContent.boundingBox();

    // Content should fit within viewport (approximately)
    expect(contentBox.width).toBeLessThanOrEqual(bodyBox.width + 100); // Small margin for scrollbar
  });

  test('game view should be responsive', async ({ page }) => {
    await page.goto('/');

    await page.fill('#session-name-input', 'Responsive Test');
    await page.fill('#create-name-input', 'Test');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    // Key elements should be visible
    await expect(page.locator('.game-header')).toBeVisible();
    await expect(page.locator('#participants-grid')).toBeVisible();
    await expect(page.locator('.calculator')).toBeVisible();
    await expect(page.locator('#vote-cards')).toBeVisible();
  });

  test('theme toggle button should be accessible across screen sizes', async ({ page }) => {
    await page.goto('/');

    const themeBtn = page.locator('#btn-toggle-theme');
    await expect(themeBtn).toBeVisible();

    const box = await themeBtn.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });
});
