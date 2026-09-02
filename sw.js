const CACHE = 'tagebuch-v25';
const ASSETS = ['./', './index.html', './stats.js', './lock.js', './presets.js', './wirkstoffe.js', './plan.js',
                './sync.js', './firebase-config.js', './manifest.json',
                './icon-192.png', './icon-512.png', './icon-180.png'];

/* {cache:'reload'} ist hier nicht optional.

   Ohne das holt addAll die Dateien aus dem HTTP-Cache des Browsers. GitHub
   Pages setzt darauf ein max-age von zehn Minuten - der frisch installierte
   Service Worker legt sich also alte Dateien in einen neuen Cache und
   liefert sie fuer immer aus. Praktisch heisst das: neues index.html,
   altes presets.js, und die App sieht halb aktualisiert aus. */
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) =>
    c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))
  ));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    // Der Seite Bescheid geben, dass eine neue Fassung aktiv ist
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.postMessage({ type: 'tagebuch-updated', version: CACHE }));
  })());
});

/* Aus dem Cache antworten und gleichzeitig im Hintergrund nachladen.

   Vorher lief das "Netzwerk zuerst" - korrekt, aber jeder App-Start hing
   dann am Netz und fuehlte sich zaeh an. Jetzt ist der Start sofort da,
   die neue Fassung landet im Hintergrund im Cache und wird beim naechsten
   Start ausgeliefert; die App blendet dafuer einen Hinweis ein. */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request, { ignoreSearch: true });

    // Auch beim Nachladen am HTTP-Cache vorbei - sonst derselbe Fehler
    const fresh = (() => {
      try { return fetch(e.request, { cache: 'no-cache' }); }
      catch (err) { return fetch(e.request); }
    })();
    const fromNetwork = fresh.then((res) => {
      if (res && res.ok) cache.put(e.request, res.clone());
      return res;
    }).catch(() => null);

    if (cached) {
      e.waitUntil(fromNetwork);      // Nachladen laeuft weiter, blockiert aber nichts
      return cached;
    }
    return (await fromNetwork) || (await cache.match('./index.html'));
  })());
});
