/* Service worker Katalog Elitech
 * - Halaman & berkas aplikasi : jaringan dulu, cadangan dari cache (jadi update index.html langsung terbaca)
 * - data.json & API GAS       : jaringan dulu, kalau offline pakai data terakhir yang tersimpan
 * - Foto Drive & font         : tidak di-cache oleh SW (dibiarkan ke cache bawaan browser)
 * Naikkan VERSI kalau daftar PRECACHE berubah. */
var VERSI   = 'v1';
var SHELL   = 'elitech-shell-' + VERSI;
var RUNTIME = 'elitech-data-' + VERSI;
var PRECACHE = ['./', 'index.html', 'manifest.webmanifest', 'assets/Icon%20192.png', 'assets/Icon%20512.png', 'data.json'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (c) {
      // satu per satu: kalau ada berkas yang belum ada (mis. data.json), yang lain tetap tersimpan
      return Promise.all(PRECACHE.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== SHELL && k !== RUNTIME; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function networkFirst(req, cacheName, fallbackUrl) {
  return fetch(req).then(function (res) {
    if (res && res.ok) {
      var copy = res.clone();
      caches.open(cacheName).then(function (c) { c.put(req, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || (fallbackUrl ? caches.match(fallbackUrl) : null) || Response.error();
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, SHELL, 'index.html'));
    return;
  }
  if (url.origin === self.location.origin) {
    e.respondWith(networkFirst(req, url.pathname.indexOf('data.json') > -1 ? RUNTIME : SHELL));
    return;
  }
  // API Google Apps Script (JSON katalog)
  if (/(^|\.)script\.google(usercontent)?\.com$/.test(url.hostname)) {
    e.respondWith(networkFirst(req, RUNTIME));
  }
});
