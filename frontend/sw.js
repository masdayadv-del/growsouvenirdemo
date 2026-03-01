// ═══════════════════════════════════════════════════════
// Grow Souvenir — Service Worker v1.0.0
// Professional PWA with multi-strategy caching
// ═══════════════════════════════════════════════════════

const CACHE_VERSION = 'grow-v1.0.1';
const RUNTIME_CACHE = 'grow-runtime-v1.0.1';
const FONT_CACHE = 'grow-fonts-v1';
const CDN_CACHE = 'grow-cdn-v1';
const API_CACHE = 'grow-api-v1.0.1';

// Aset statis yang di-precache saat install
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './assets/style.css',
    './assets/tailwind.min.css',
    './assets/defs.js',
    './assets/app.js',
    './assets/pdf-styles.js',
    './assets/icon-192.png',
    './assets/icon-512.png'
];

// ─── INSTALL: Pre-cache app shell ───
self.addEventListener('install', (event) => {
    console.log('[SW] Installing v' + CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ─── ACTIVATE: Cleanup old caches ───
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v' + CACHE_VERSION);
    const currentCaches = [CACHE_VERSION, RUNTIME_CACHE, FONT_CACHE, CDN_CACHE, API_CACHE];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => !currentCaches.includes(name))
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// ─── FETCH: Multi-strategy routing ───
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip chrome-extension and other non-http(s) schemes
    if (!url.protocol.startsWith('http')) return;

    // 1) Google Fonts → Cache First (long-lived)
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        event.respondWith(cacheFirst(request, FONT_CACHE));
        return;
    }

    // 2) CDN resources (Alpine.js, etc.) → Stale While Revalidate
    if (url.hostname.includes('cdn.jsdelivr.net')) {
        event.respondWith(staleWhileRevalidate(request, CDN_CACHE));
        return;
    }

    // 3) API calls (Google Apps Script) → Network First
    if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) {
        event.respondWith(networkFirst(request, API_CACHE));
        return;
    }

    // 4) External resources (ui-avatars, etc.) → Stale While Revalidate
    if (url.origin !== self.location.origin) {
        event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
        return;
    }

    // 5) App Shell (same-origin HTML/CSS/JS/images) → Cache First
    event.respondWith(cacheFirst(request, CACHE_VERSION));
});


// ═══════════════════════════════════════════════════════
// CACHING STRATEGIES
// ═══════════════════════════════════════════════════════

/**
 * Cache First — Cari di cache dulu, fallback ke network
 * Cocok untuk: app shell, fonts, static assets
 */
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Return offline fallback for navigation requests
        if (request.mode === 'navigate') {
            const fallback = await caches.match('./index.html');
            if (fallback) return fallback;
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

/**
 * Network First — Coba network dulu, fallback ke cache
 * Cocok untuk: API calls (data harus fresh)
 */
async function networkFirst(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(JSON.stringify({ error: true, message: 'Offline — data dari cache tidak tersedia' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Stale While Revalidate — Serve dari cache, update di background
 * Cocok untuk: CDN libraries, external resources
 */
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => cachedResponse);

    return cachedResponse || fetchPromise;
}
