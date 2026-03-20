// ============================================================
// ably-config.js — AVB Planning Poker
//
// Source of apiKey priority:
//   1) window.__ABLY_API_KEY__ (injected at deploy time)
//   2) ABLY_API_KEY global (optional script override)
//   3) '' (falls back to demo mode)
//
// NOTE:
//   - Any browser key is public. For stronger security, use Ably token auth.
//   - This app keeps room state ephemeral and only in realtime messages.
// ============================================================

const ABLY_CONFIG = {
  apiKey: window.__ABLY_API_KEY__ || (typeof ABLY_API_KEY !== 'undefined' ? ABLY_API_KEY : ''),
  channelPrefix: 'avb-poker',
  roomTtlMinutes: 120,
};
