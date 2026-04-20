/**
 * Nextflix Shield — Final Engine (Operation Retro)
 * High-performance Bloom Filter AdBlocker.
 * Pure ES5 version for Legacy Hardware.
 */

var VERSION = "v2.0.1";
var filterBuffer = null;
var m = 0;
var k = 0;

// Minimal FNV-1a hash
function hash(str, seed) {
  var h = 0x811c9dc5 ^ seed;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

// Bloom Filter test function
function isBlocked(hostname) {
  if (!filterBuffer || !m || !k) return false;

  var parts = hostname.split(".");
  for (var i = 0; i < parts.length - 1; i++) {
    var domain = parts.slice(i).join(".");
    if (checkFilter(domain)) return true;
  }
  return false;
}

function checkFilter(str) {
  var bitCount = m;
  for (var i = 0; i < k; i++) {
    var h = hash(str, i) % bitCount;
    if (!(filterBuffer[h >> 3] & (1 << (h % 8)))) return false;
  }
  return true;
}

function loadFilter() {
  return fetch("/filter.bin", { cache: "no-cache" })
    .then(function(response) { return response.arrayBuffer(); })
    .then(function(arrayBuffer) {
      var view = new DataView(arrayBuffer);
      var magic = String.fromCharCode(
        view.getUint8(0), view.getUint8(1),
        view.getUint8(2), view.getUint8(3)
      );

      if (magic !== "NFSD") throw new Error("Invalid filter format");

      m = view.getUint32(4, true);
      k = view.getUint32(8, true);
      filterBuffer = new Uint8Array(arrayBuffer, 12);

      console.log('[Nextflix Shield] Retro Firewall loaded:', m, k);
    })
    .catch(function(err) {
      console.error("[Nextflix Shield] Failed to load retro firewall:", err);
    });
}

self.addEventListener("install", function(event) {
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    Promise.all([
      loadFilter(),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", function(event) {
  var url = new URL(event.request.url);
  var hostname = url.hostname.toLowerCase();
  var isNavigation = event.request.mode === "navigate" || event.request.destination === "document";

  if (hostname === self.location.hostname || hostname === 'api.themoviedb.org') return;

  if (isBlocked(hostname) || 
      hostname.indexOf("rtmark.net") !== -1 || 
      hostname.indexOf("104processors.net") !== -1 || 
      hostname.indexOf("yandex.ru") !== -1) {
    
    console.warn("[Nextflix Shield] Blocked hostname:", hostname);
    
    reportBlocked(hostname);

    if (isNavigation) {
        event.respondWith(new Response(null, { status: 204, statusText: "No Content" }));
        return;
    }

    event.respondWith(
      new Response("/* Shielded */", {
        status: 200,
        statusText: "OK",
        headers: { "Content-Type": "application/javascript" }
      })
    );
  }
});

function reportBlocked(domain) {
  return self.clients.matchAll().then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({
        type: "AD_BLOCKED",
        domain: domain
      });
    });
  });
}
