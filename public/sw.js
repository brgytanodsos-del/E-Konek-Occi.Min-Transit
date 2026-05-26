importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js');

const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { registerRoute } = workbox.routing;
const { NetworkFirst, CacheFirst, StaleWhileRevalidate } = workbox.strategies;
const { BackgroundSyncPlugin } = workbox.backgroundSync;

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// Cache static assets
registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'style' || request.destination === 'script',
  new CacheFirst()
);

// API routes - Network First with Background Sync fallback
const bgSyncPlugin = new BackgroundSyncPlugin('ekonekQueue', {
  maxRetentionTime: 24 * 60, // Retry for 24 hours
});

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') || url.pathname.includes('firestore'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [bgSyncPlugin],
  })
);

// Leaflet map tiles
registerRoute(
  ({ url }) => url.href.includes('tile.openstreetmap.org'),
  new StaleWhileRevalidate({ cacheName: 'map-tiles' })
);

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bookings') {
    // In actual implementation, we might call local IDB processing here
    // as service worker has a different scope. For now we will broadcast or 
    // rely on standard sync event
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({ type: 'PROCESS_QUEUE' }));
    });
  }
});
