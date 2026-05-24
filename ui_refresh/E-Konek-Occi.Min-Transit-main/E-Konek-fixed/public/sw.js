const CACHE_NAME = 'mindorotransit-v2';
self.addEventListener('install', e => {
    // @ts-ignore
    e.waitUntil(caches.open(CACHE_NAME));
});
self.addEventListener('fetch', e => {
    // @ts-ignore
    e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
