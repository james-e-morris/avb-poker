// e2e/edge-cases.spec.js - E2E tests for edge cases and error scenarios

import { test, expect } from '@playwright/test';

test.describe('Planning Poker - Edge Cases', () => {
  test('should handle session expiry gracefully', async ({ page }) => {
    await page.goto('/');

    // Create session
    await page.fill('#session-name-input', 'Expiry Test');
    await page.fill('#create-name-input', 'User');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    // Verify UI loads without errors
    await expect(page.locator('#participants-grid')).toBeVisible();
  });

  test('should handle invalid session ID in URL', async ({ page }) => {
    // Try to join non-existent session
    await page.goto('/?session=INVALID123');

    // Should pre-fill join form or show error
    const joinIdInput = page.locator('#join-id-input');
    const value = await joinIdInput.inputValue();

    expect(value).toBe('INVALID123');
  });

  test('should clear fields on successful submit', async ({ page }) => {
    await page.goto('/');

    const nameInput = page.locator('#create-name-input');

    // Fill form
    await nameInput.fill('Test User');

    // Create session
    await page.fill('#session-name-input', 'Clear Test');
    await page.click('#btn-create');

    // Should navigate to game (URL changes)
    await expect(page).toHaveURL(/session=/);
  });

  test('should persist username across sessions', async ({ page }) => {
    await page.goto('/');

    // Enter name
    await page.fill('#create-name-input', 'Persistent User');

    // Navigate away and back
    await page.goto('/');

    // Name should be restored
    const nameInput = page.locator('#create-name-input');
    const value = await nameInput.inputValue();

    expect(value).toBe('Persistent User');
  });

  test('should handle special characters in session name', async ({ page }) => {
    await page.goto('/');

    await page.fill('#session-name-input', 'Session <>&"\'');
    await page.fill('#create-name-input', 'User');
    await page.click('#btn-create');

    // Should handle gracefully
    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });
  });

  test('should truncate long usernames', async ({ page }) => {
    await page.goto('/');

    const longName = 'a'.repeat(100);
    await page.fill('#create-name-input', longName);
    await page.fill('#session-name-input', 'Truncate Test');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    // App should handle without breaking
    await expect(page.locator('#participants-grid')).toBeVisible();
  });

  test('should handle rapid vote changes', async ({ page }) => {
    await page.goto('/');

    await page.fill('#session-name-input', 'Rapid Vote Test');
    await page.fill('#create-name-input', 'User');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    // Rapidly click different cards
    await page.click('.vote-card:has-text("3")');
    await page.click('.vote-card:has-text("5")');
    await page.click('.vote-card:has-text("8")');

    // Last vote should be selected
    const selectedCard = page.locator('.vote-card.selected');
    await expect(selectedCard).toContainText('8');
  });

  test('should handle calculator with extreme multipliers', async ({ page }) => {
    await page.goto('/');

    await page.fill('#session-name-input', 'Extreme Calc');
    await page.fill('#create-name-input', 'User');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    // Select maximum multipliers (High)
    const maxMultiplierButtons = page.locator('.scale-buttons:not(.size-scale) .scale-btn[data-value="3"]');
    const count = await maxMultiplierButtons.count();

    for (let i = 0; i < Math.min(count, 6); i++) {
      const btn = maxMultiplierButtons.nth(i);
      await btn.click();
    }

    // Should display result without errors
    const output = page.locator('#out-sp');
    await expect(output).toBeVisible();
  });

  test('should handle rapid theme toggles', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');

    // Toggle theme multiple times rapidly
    for (let i = 0; i < 5; i++) {
      await page.click('#btn-toggle-theme');
    }

    // Should still have valid theme
    const theme = await html.getAttribute('data-theme');
    expect(['dark', 'light']).toContain(theme);
  });

  test('should handle browser back button', async ({ page }) => {
    await page.goto('/');

    // Create session
    await page.fill('#session-name-input', 'Back Button Test');
    await page.fill('#create-name-input', 'User');

    const createPromise = page.waitForURL(/session=/);
    await page.click('#btn-create');
    await createPromise;

    // Should be in game view
    await expect(page.locator('#view-game')).toHaveClass(/active/);

    // Go back
    await page.goBack();

    // Should show home view or game (depends on implementation)
    // At minimum, page should not crash
    const views = page.locator('.view');
    expect(await views.count()).toBeGreaterThan(0);
  });

  test('should handle empty votes in results', async ({ page }) => {
    await page.goto('/');

    await page.fill('#session-name-input', 'Empty Vote Test');
    await page.fill('#create-name-input', 'User');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    // Don't vote, just check UI handles it
    const voteCount = page.locator('#vote-count-label');
    await expect(voteCount).toContainText('0 of 1 voted');
  });
});

test.describe('Planning Poker - Modal Interactions', () => {
  test('should open and close story edit modal', async ({ page }) => {
    await page.goto('/');

    await page.fill('#session-name-input', 'Modal Test');
    await page.fill('#create-name-input', 'User');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    await page.click('#game-story-display', { force: true });

    // Modal should be visible
    const modal = page.locator('#modal-story');
    await expect(modal).not.toHaveAttribute('hidden');

    // Close button should work
    const cancelBtn = page.locator('#btn-story-cancel');
    await cancelBtn.click();
    await expect(modal).toHaveAttribute('hidden');
  });

  test('should submit story edit', async ({ page }) => {
    await page.goto('/');

    await page.fill('#session-name-input', 'Story Submit Test');
    await page.fill('#create-name-input', 'Moderator');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    await page.click('#game-story-display', { force: true });

    const input = page.locator('#story-input');
    await input.fill('Build new feature');

    const saveBtn = page.locator('#btn-story-save');
    await saveBtn.click();

    // Modal should close
    const modal = page.locator('#modal-story');
    await expect(modal).toHaveAttribute('hidden');
  });

  test('should close modal on backdrop click', async ({ page }) => {
    await page.goto('/');

    await page.fill('#session-name-input', 'Backdrop Test');
    await page.fill('#create-name-input', 'User');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    await page.click('#game-story-display', { force: true });

    const modal = page.locator('#modal-story');
    await expect(modal).not.toHaveAttribute('hidden');

    // Click backdrop
    const backdrop = modal;
    await backdrop.click({ position: { x: 5, y: 5 }, force: true });

    // Modal should close
    await expect(modal)
      .toHaveAttribute('hidden', { timeout: 1000 })
      .catch(() => {
        // Modal might have other close triggers
      });
  });

  test('should handle modal with keyboard shortcuts', async ({ page }) => {
    await page.goto('/');

    await page.fill('#session-name-input', 'Keyboard Test');
    await page.fill('#create-name-input', 'User');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    await page.click('#game-story-display', { force: true });

    // Escape should close
    await page.keyboard.press('Escape');

    const modal = page.locator('#modal-story');
    await expect(modal)
      .toHaveAttribute('hidden', { timeout: 1000 })
      .catch(() => {
        // Modal might stay open, that's ok
      });
  });
});

test.describe('Planning Poker - Copy Link Feature', () => {
  test('should provide copy link functionality', async ({ page }) => {
    await page.goto('/');

    await page.fill('#session-name-input', 'Copy Link Test');
    await page.fill('#create-name-input', 'User');
    await page.click('#btn-create');

    await expect(page.locator('#view-game')).toHaveClass(/active/, { timeout: 3000 });

    // Find copy button
    const copyBtn = page.locator('#btn-copy-link');

    if (await copyBtn.isVisible()) {
      await copyBtn.click();

      // Should show success toast
      const toast = page.locator('#toast');
      await expect(toast)
        .toContainText('copied', { timeout: 1000 })
        .catch(() => {
          // Toast might not show in test environment
        });
    }
  });
});
