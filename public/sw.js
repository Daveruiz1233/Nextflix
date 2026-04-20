/**
 * Nextflix Shield — Service Worker (Operation AdGuard)
 * Intercepts ALL fetch/navigate requests with a hardcoded high-priority
 * blocklist + Bloom filter for deep coverage.
 *
 * Pure ES5 for maximum legacy device compatibility.
 */

var VERSION = "v3.0.0";
var filterBuffer = null;
var m = 0;
var k = 0;

// ─────────────────────────────────────────────────────────────────
// HIGH-PRIORITY BLOCKLIST (hardcoded, instant, no binary needed)
// Same approach as AdGuard extension's built-in rules
// ─────────────────────────────────────────────────────────────────
var BLOCKED_DOMAINS = [
  // Known redirect/popup networks
  "rtmark.net", "104processors.net", "yandex.ru", "adscore.info",
  "tarzansaminate.cfd", "streameeeeee.site", "vidlink.pro",
  // Ad networks
  "doubleclick.net", "googlesyndication.com", "google-analytics.com",
  "googletagmanager.com", "taboola.com", "outbrain.com",
  "popads.net", "popcash.net", "propellerads.com", "exoclick.com",
  "trafficjunky.net", "traffichaus.com", "juicyads.com",
  "hilltopads.net", "plugrush.com", "ero-advertising.com",
  "adsterra.com", "bidvertiser.com", "yllix.com", "clickadu.com",
  "adclickmedia.com", "a-ads.com", "coinzilla.com",
  // Trackers
  "scorecardresearch.com", "quantserve.com", "omtrdc.net",
  "2mdn.net", "adsrvr.org", "rubiconproject.com", "casalemedia.com",
  "openx.net", "pubmatic.com", "smartadserver.com", "criteo.com",
  "rlcdn.com", "agkn.com", "krxd.net", "nexac.com",
  // Popup/redirect scripts used by vidsrc et al
  "go.redtube.com", "cdn.vodlix.com", "rplnd.com",
  "pocketmags.com", "aligans.com", "reliablesite.net",
  "clickhorsing.com", "offercdn.com", "a.bestadszone.com",
  "exosrv.com", "exoclick.com", "mxpnl.com",
  "amplitude.com", "segment.io", "segment.com"
];

// Allowed domains — NEVER block these
var ALLOWED_DOMAINS = [
  "localhost", "api.themoviedb.org", "image.tmdb.org",
  "player.videasy.net", "vidsrc.to", "vidsrc.xyz", "vidsrc.cc",
  "vidsrc.me", "vidsrc.net", "vidsrc.io", "vidsrc.in",
  "embed.su", "multiembed.mov", "autoembed.co", "vixsrc.to",
  "fonts.googleapis.com", "fonts.gstatic.com"
];

function isDomainBlocked(hostname) {
  if (!hostname) return false;
  var h = hostname.toLowerCase();

  // Whitelist check first
  for (var i = 0; i < ALLOWED_DOMAINS.length; i++) {
    if (h === ALLOWED_DOMAINS[i] || h.endsWith("." + ALLOWED_DOMAINS[i])) {
      return false;
    }
  }

  // Hardcoded blocklist
  for (var j = 0; j < BLOCKED_DOMAINS.length; j++) {
    if (h === BLOCKED_DOMAINS[j] || h.endsWith("." + BLOCKED_DOMAINS[j])) {
      return true;
    }
  }

  // Bloom filter (if loaded)
  if (filterBuffer && m && k) {
    return isBlockedByFilter(h);
  }

  return false;
}

function isBlockedByFilter(hostname) {
  var parts = hostname.split(".");
  for (var i = 0; i < parts.length - 1; i++) {
    var domain = parts.slice(i).join(".");
    if (checkFilter(domain)) return true;
  }
  return false;
}

// Minimal FNV-1a hash
function hash(str, seed) {
  var h = 0x811c9dc5 ^ seed;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

function checkFilter(str) {
  for (var i = 0; i < k; i++) {
    var h = hash(str, i) % m;
    if (!(filterBuffer[h >> 3] & (1 << (h % 8)))) return false;
  }
  return true;
}

function loadFilter() {
  return fetch("/filter.bin", { cache: "no-cache" })
    .then(function(response) { return response.arrayBuffer(); })
    .then(function(buf) {
      var view = new DataView(buf);
      var magic = String.fromCharCode(
        view.getUint8(0), view.getUint8(1),
        view.getUint8(2), view.getUint8(3)
      );
      if (magic !== "NFSD") throw new Error("Bad format");
      m = view.getUint32(4, true);
      k = view.getUint32(8, true);
      filterBuffer = new Uint8Array(buf, 12);
      console.log("[Shield SW] Bloom filter loaded:", m, "bits,", k, "hashes");
    })
    .catch(function(err) {
      // Not fatal — hardcoded list still works
      console.warn("[Shield SW] No bloom filter, using hardcoded list only:", err.message);
    });
}

// ─────────────────────────────────────────────────────────────────
// SERVICE WORKER LIFECYCLE
// ─────────────────────────────────────────────────────────────────
self.addEventListener("install", function(event) {
  console.log("[Shield SW] Installing v" + VERSION);
  self.skipWaiting(); // Activate immediately
});

self.addEventListener("activate", function(event) {
  console.log("[Shield SW] Activating v" + VERSION);
  event.waitUntil(
    Promise.all([
      loadFilter(),
      self.clients.claim() // Take control of all existing clients immediately
    ])
  );
});

// ─────────────────────────────────────────────────────────────────
// FETCH INTERCEPT — The core of the AdGuard approach
// Intercepts ALL network requests (scripts, images, XHR, navigation)
// ─────────────────────────────────────────────────────────────────
self.addEventListener("fetch", function(event) {
  var req = event.request;
  var url;

  try {
    url = new URL(req.url);
  } catch(e) {
    return; // Malformed URL, ignore
  }

  var hostname = url.hostname.toLowerCase();
  var isNavigate = req.mode === "navigate" || req.destination === "document";

  // Never intercept our own origin (Capacitor internal loads)
  if (hostname === self.location.hostname) return;

  // Check if this domain should be blocked
  if (isDomainBlocked(hostname)) {
    console.warn("[Shield SW] BLOCKED:", req.mode, hostname);

    // Report to all clients (updates blocked counter in UI)
    reportBlocked(hostname);

    if (isNavigate) {
      // For navigation redirects: return empty page — kills the redirect
      event.respondWith(
        new Response(
          "<html><body></body></html>",
          { status: 200, headers: { "Content-Type": "text/html" } }
        )
      );
    } else {
      // For scripts/images/XHR: return empty 200 (stealth mode — no AdBlock detection)
      event.respondWith(
        new Response("", {
          status: 200,
          statusText: "OK",
          headers: { "Content-Type": "text/plain" }
        })
      );
    }
    return;
  }

  // URL pattern blocking (even if domain not in list)
  var path = url.pathname.toLowerCase();
  var isAdPath = (
    path.indexOf("/ads/") !== -1 ||
    path.indexOf("/pop") !== -1 ||
    path.indexOf("/popup") !== -1 ||
    (path.indexOf("track") !== -1 && path.indexOf(".php") !== -1) ||
    path.indexOf("prebid") !== -1
  );

  if (isAdPath) {
    console.warn("[Shield SW] BLOCKED (pattern):", req.url);
    reportBlocked(hostname);
    event.respondWith(new Response("", { status: 200 }));
    return;
  }

  // All other requests: pass through normally
});

function reportBlocked(domain) {
  return self.clients.matchAll().then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({ type: "AD_BLOCKED", domain: domain });
    });
  });
}
