/**
 * Nextflix Shield — Final Engine
 * High-performance Bloom Filter AdBlocker.
 * Matches 160,000+ AdGuard rules in O(1) time.
 */

const VERSION = "v2.0.0";
let filterBuffer = null;
let m = 0;
let k = 0;

// Minimal FNV-1a hash - MUST MATCH COMPILER
function hash(str, seed) {
  let h = 0x811c9dc5 ^ seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

// Bloom Filter test function
function isBlocked(hostname) {
  if (!filterBuffer || !m || !k) return false;

  const parts = hostname.split(".");
  // Check domain and all parent domains (e.g. ad.example.com, example.com)
  for (let i = 0; i < parts.length - 1; i++) {
    const domain = parts.slice(i).join(".");
    if (checkFilter(domain)) return true;
  }
  return false;
}

function checkFilter(str) {
  const bitCount = m;
  for (let i = 0; i < k; i++) {
    const h = hash(str, i) % bitCount;
    if (!(filterBuffer[h >> 3] & (1 << (h % 8)))) return false;
  }
  return true;
}

async function loadFilter() {
  try {
    const response = await fetch("/filter.bin", { cache: "no-cache" });
    const arrayBuffer = await response.arrayBuffer();
    const view = new DataView(arrayBuffer);

    // Check Magic 'NFSD'
    const magic = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );

    if (magic !== "NFSD") {
      throw new Error("Invalid filter binary format");
    }

    m = view.getUint32(4, true);
    k = view.getUint32(8, true);
    filterBuffer = new Uint8Array(arrayBuffer, 12);

    console.log(`[Nextflix Shield] Firewall loaded: ${m} bits, ${k} hashes.`);
  } catch (err) {
    console.error("[Nextflix Shield] Failed to load firewall:", err);
  }
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([loadFilter(), self.clients.claim()]));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const hostname = url.hostname.toLowerCase();

  // Don't block our own scripts or the filter binary
  if (hostname === self.location.hostname) return;

  if (isBlocked(hostname)) {
    console.warn(`[Nextflix Shield] Blocked (Stealth): ${hostname}`);
    
    // Notify clients to increment counter
    reportBlocked(hostname);

    // Stealth Mode: Return 200 OK with empty body 
    // This tricks ad-score and anti-adblockers into thinking the tracker loaded.
    event.respondWith(
      new Response("", {
        status: 200,
        statusText: "OK",
        headers: { "Content-Type": "text/plain" }
      })
    );
  }
});

async function reportBlocked(domain) {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: "AD_BLOCKED",
      domain: domain,
    });
  });
}
