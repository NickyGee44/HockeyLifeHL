// Polyfill SharedArrayBuffer for Hermes (not available in Expo Go)
if (typeof globalThis.SharedArrayBuffer === 'undefined') {
  globalThis.SharedArrayBuffer = ArrayBuffer;
}
