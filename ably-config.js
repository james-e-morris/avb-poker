// ============================================================
// ably-config.js — AVB Planning Poker
//
// API Key Injection:
//   window.__ABLY_API_KEY__ is injected at deploy time via GitHub Actions.
//   It is set as an inline <script> in index.html and never appears in version control.
//   If not provided, app auto-falls back to demo mode (localStorage + BroadcastChannel).
//
// Security Notes:
//   - The API key is injected as window.__ABLY_API_KEY__ during GitHub Pages deployment
//   - In demo mode, all data stays local (same browser/tabs only)
//   - For production use: Consider token authentication instead of bare API keys
//   - See README.md for Ably token auth setup recommendations
// ============================================================

const ABLY_CONFIG = {
  apiKey: window.__ABLY_API_KEY__ || '',
  channelPrefix: 'avb-poker',
  roomTtlMinutes: 120,
};
