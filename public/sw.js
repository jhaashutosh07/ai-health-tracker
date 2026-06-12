// Minimal service worker — enables PWA installability.
// Network passthrough; no offline caching of health data by design.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
