const CACHE_NAME = "linkedup-cache-v2";

const FILES_TO_CACHE = [
  "/",
  "/logo.png",
  "/icon-192.png",
  "/icon-512.png"
];

// 1. Install files into the cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(FILES_TO_CACHE);
      })
  );
});

// 2. Clear out older version caches when a new version activates
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Clearing old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Network-First Strategy: Check the internet first, fall back to cache if offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If the network request works, clone it into the cache for offline use
        if (networkResponse && networkResponse.status === 200 && event.request.method === "GET") {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If internet is down, load from cache
        return caches.match(event.request);
      })
  );
});

// 4. Force activation when user approves the update popup
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
