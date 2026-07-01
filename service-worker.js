const CACHE_NAME = "4dmk-pwa-v3";

const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/login.html",
    "/registro.html",
    "/panel.html",
    "/mis-pedidos.html",
    "/mi-cuenta.html",
    "/cotizar.html",
    "/enviar.html",
    "/css/estilos.css",
    "/js/main.js",
    "/js/login.js",
    "/js/registro.js",
    "/js/mis-pedidos.js",
    "/js/mi-cuenta.js",
    "/js/cotizar.js",
    "/js/pwa.js",
    "/js/supabase-config.js",
    "/img/logo.png",
    "/img/hero.png"
];

self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                return cache.addAll(STATIC_ASSETS);
            })
            .catch(function (error) {
                console.log("No se pudieron guardar algunos archivos en caché:", error);
            })
    );

    self.skipWaiting();
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );

    self.clients.claim();
});

self.addEventListener("fetch", function (event) {
    const requestUrl = new URL(event.request.url);

    // No cachear APIs. Siempre deben consultar datos actuales.
    if (requestUrl.pathname.startsWith("/api/")) {
        event.respondWith(fetch(event.request));
        return;
    }

    // No cachear Supabase ni servicios externos.
    if (
        requestUrl.hostname.includes("supabase.co") ||
        requestUrl.hostname.includes("cdnjs.cloudflare.com") ||
        requestUrl.hostname.includes("fonts.googleapis.com") ||
        requestUrl.hostname.includes("fonts.gstatic.com")
    ) {
        event.respondWith(fetch(event.request));
        return;
    }

    // No cachear peticiones que no sean GET.
    if (event.request.method !== "GET") {
        event.respondWith(fetch(event.request));
        return;
    }

    // Para navegación HTML: intentar red primero, luego caché.
    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request)
                .then(function (networkResponse) {
                    return networkResponse;
                })
                .catch(function () {
                    return caches.match("/login.html");
                })
        );
        return;
    }

    // Para archivos estáticos: intentar caché, luego red.
    event.respondWith(
        caches.match(event.request)
            .then(function (cachedResponse) {
                return cachedResponse || fetch(event.request);
            })
    );
});