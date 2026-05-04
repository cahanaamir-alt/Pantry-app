// Service Worker for "המזווה שלי" v2.5
// Place this file at the same level as index.html

var CACHE_NAME = 'pantry-v2.5';
var PRECACHE = ['./'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function(c) { return c.addAll(PRECACHE); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(names) {
    return Promise.all(names.filter(function(n) { return n !== CACHE_NAME; }).map(function(n) { return caches.delete(n); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  // Don't cache Firestore or Auth requests
  if (e.request.url.indexOf('firestore.googleapis.com') !== -1) return;
  if (e.request.url.indexOf('googleapis.com/identitytoolkit') !== -1) return;
  if (e.request.url.indexOf('securetoken.googleapis.com') !== -1) return;

  // Network-first strategy with cache fallback
  e.respondWith(fetch(e.request).then(function(r) {
    if (r && r.status === 200) {
      var rc = r.clone();
      caches.open(CACHE_NAME).then(function(c) { c.put(e.request, rc); });
    }
    return r;
  }).catch(function() { return caches.match(e.request); }));
});
