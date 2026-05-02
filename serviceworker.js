const cacheName = 'TSCPP-v1';
const staticAssets = [
  './',
  './index.html',
  './styles.css',
  './discord.html',
  './errorcodes.html',
  './information.html',
  './page2.html',
  './rules.html',
  './status.html',
  './terminal-common.js',
  './serviceworker.js',
  './manifest.json',
  './tscpp.png',
];


self.addEventListener('install', async (event) => {
  const cache = await caches.open(cacheName);
  await cache.addAll(staticAssets);
});


self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
