// config/jest.setup.js - Jest Setup for Planning Poker Tests

// Mock window.__ABLY_API_KEY__
global.window = {
  ...global.window,
  __ABLY_API_KEY__: undefined,
  crypto: {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
};

// Mock BroadcastChannel
global.BroadcastChannel = jest.fn().mockImplementation(() => ({
  onmessage: null,
  postMessage: jest.fn(),
  close: jest.fn(),
}));

// Mock Ably (if needed in tests)
global.Ably = undefined;

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock navigator.clipboard
global.navigator = {
  ...global.navigator,
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
};

// Mock document.execCommand
document.execCommand = jest.fn().mockReturnValue(true);

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});
