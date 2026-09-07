const CACHE = "musicboost-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js?v=bit6",
  "./manifest.webmanifest",
  "./public/icons/icon-192.png",
  "./public/icons/icon-512.png",
  "./public/images/bit-qr.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const live = fetch(event.request).then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return res;
      }).catch(() => cached);
      return cached || live;
    }),
  );
});
