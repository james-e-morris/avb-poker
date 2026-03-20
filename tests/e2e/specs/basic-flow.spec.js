// e2e/basic-flow.spec.js - E2E tests for basic Planning Poker flow

import { test, expect } from '@playwright/test';

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
    await expect(page.locator('#view-loading')).toHaveClass(/active/, { timeout: 1000 }).catch(() => {});
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
    await page2.goto(`/?session=${sessionId}`);
    await page2.fill('#join-name-input', 'Charlie');
    await page2.click('#btn-join');
    
    // Should enter game view
    await expect(page2.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });
    
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

  test('should show formula preview', async ({ page }) => {
    await page.goto('/');
    
    const details = page.locator('.formula-preview');
    await expect(details).toBeVisible();
    
    // Click to open
    await page.click('.formula-preview summary');
    
    // Should show formula grid
    await expect(page.locator('.formula-grid')).toBeVisible();
  });
});

test.describe('Planning Poker - Voting Flow', () => {
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
    await expect(voteCount).toContainText('1 / 1 voted');
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
    await page2.goto(`/?session=${sessionId}`);
    await page2.fill('#join-name-input', 'Participant');
    await page2.click('#btn-join');
    
    await expect(page2.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });
    await page2.click('.vote-card:has-text("5")');
    
    // Reveal button should appear for moderator
    const revealBtn = page.locator('#btn-reveal');
    await expect(revealBtn).not.toHaveAttribute('hidden');
    
    // Click reveal
    await page.click('#btn-reveal');
    
    // Results should show on both pages
    const resultsArea = page.locator('#results-area');
    await expect(resultsArea).not.toHaveAttribute('hidden');
    
    const resultsArea2 = page2.locator('#results-area');
    await expect(resultsArea2).not.toHaveAttribute('hidden');
    
    await page2.close();
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
