// ===== המזווה שלי — Service Worker v2.0 =====

var CACHE_NAME = 'pantry-v2.0';
var IMAGE_CACHE = 'pantry-images-v1';

var PRECACHE_URLS = [
  '/',
  '/index.html',
  '/pantry-v2.html'
];

// Install — pre-cache core assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate — clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME && name !== IMAGE_CACHE;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch — network-first for API, cache-first for assets
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Cache product images from Open Food Facts
  if (url.indexOf('openfoodfacts.org/images') !== -1) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(function(cache) {
        return cache.match(event.request).then(function(cached) {
          if (cached) return cached;
          return fetch(event.request).then(function(response) {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(function() {
            // Return a transparent 1x1 pixel as fallback
            return new Response(
              atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
              { headers: { 'Content-Type': 'image/gif' } }
            );
          });
        });
      })
    );
    return;
  }

  // Google Fonts — cache first
  if (url.indexOf('fonts.googleapis.com') !== -1 || url.indexOf('fonts.gstatic.com') !== -1) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(event.request).then(function(cached) {
          if (cached) return cached;
          return fetch(event.request).then(function(response) {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // Firebase SDK & API calls — network only (let Firestore handle offline)
  if (url.indexOf('firebaseio.com') !== -1 ||
      url.indexOf('googleapis.com') !== -1 ||
      url.indexOf('gstatic.com/firebasejs') !== -1) {
    return; // default fetch behavior
  }

  // Open Food Facts API — network only
  if (url.indexOf('openfoodfacts.org/api') !== -1) {
    return; // default fetch behavior
  }

  // HTML/CSS/JS app files — stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(event.request).then(function(cached) {
        var fetchPromise = fetch(event.request).then(function(response) {
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(function() {
          return cached; // offline fallback
        });
        return cached || fetchPromise;
      });
    })
  );
});
