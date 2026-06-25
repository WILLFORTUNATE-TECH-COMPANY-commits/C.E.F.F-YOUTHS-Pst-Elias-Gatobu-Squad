// ============================================================
// C.E.F.F YOUTHS - Service Worker
// ============================================================

const CACHE_NAME = 'ceff-youths-v3.1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@700;800;900&family=Poppins:wght@400;500;600;700&display=swap',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];

// ============================================================
// INSTALL - Cache core assets
// ============================================================
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(function() {
                return self.skipWaiting();
            })
            .catch(function(err) {
                console.error('[SW] Cache install failed:', err);
            })
    );
});

// ============================================================
// ACTIVATE - Clean up old caches
// ============================================================
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

// ============================================================
// FETCH - Network first with cache fallback
// ============================================================
self.addEventListener('fetch', function(event) {
    var request = event.request;
    
    if (request.method !== 'GET') {
        return;
    }
    
    if (request.url.includes('supabase.co') && 
        (request.url.includes('realtime') || 
         request.url.includes('storage') || 
         request.url.includes('rest'))) {
        return;
    }
    
    if (request.url.includes('site-images') || 
        request.url.includes('youth-photos')) {
        event.respondWith(
            caches.match(request)
                .then(function(cachedResponse) {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(request)
                        .then(function(response) {
                            var clonedResponse = response.clone();
                            caches.open(CACHE_NAME)
                                .then(function(cache) {
                                    cache.put(request, clonedResponse);
                                });
                            return response;
                        })
                        .catch(function() {
                            return new Response(
                                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#1a1a1a" width="200" height="200"/><text x="100" y="110" text-anchor="middle" fill="#00ff41" font-size="40" font-family="Arial">✝</text></svg>',
                                { headers: { 'Content-Type': 'image/svg+xml' } }
                            );
                        });
                })
        );
        return;
    }
    
    event.respondWith(
        fetch(request)
            .then(function(response) {
                if (response && response.status === 200) {
                    var clonedResponse = response.clone();
                    caches.open(CACHE_NAME)
                        .then(function(cache) {
                            cache.put(request, clonedResponse);
                        })
                        .catch(function() {});
                }
                return response;
            })
            .catch(function() {
                return caches.match(request)
                    .then(function(cachedResponse) {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        if (request.headers.get('accept') && 
                            request.headers.get('accept').includes('text/html')) {
                            return caches.match('/');
                        }
                        return new Response('', { status: 404 });
                    });
            })
    );
});

// ============================================================
// MESSAGE - Handle updates
// ============================================================
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ============================================================
// PUSH - Handle notifications
// ============================================================
self.addEventListener('push', function(event) {
    var options = {
        body: event.data ? event.data.text() : 'New update available!',
        icon: 'https://ugpcnxvgvxkryvgpletd.supabase.co/storage/v1/object/public/site-images/app-icon.png',
        badge: 'https://ugpcnxvgvxkryvgpletd.supabase.co/storage/v1/object/public/site-images/app-icon.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };
    
    event.waitUntil(
        self.registration.showNotification('✝ C.E.F.F YOUTHS', options)
    );
});

// ============================================================
// NOTIFICATION CLICK
// ============================================================
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                if (clientList.length > 0) {
                    return clientList[0].focus();
                }
                return clients.openWindow('/');
            })
    );
});

console.log('[SW] C.E.F.F YOUTHS Service Worker loaded');