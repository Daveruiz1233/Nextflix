import fs from "fs";
import path from "path";
import https from "https";

/**
 * Nextflix Shield — AdGuard Filter Compiler
 *
 * Downloads AdGuard's official open-source filter lists (CC BY-SA 4.0 licensed)
 * and compiles them into:
 *   1. public/filter.bin        — Binary Bloom Filter for the Service Worker
 *   2. adblock-rules.json       — Apple/Android Content Blocker JSON for native layers
 *
 * Filter sources (same lists the AdGuard browser extension uses):
 *   • AdGuard Base Filter        (filter #2)   — General ad blocking
 *   • AdGuard Mobile Ads Filter  (filter #11)  — Mobile-specific ads
 *   • AdGuard Tracking Filter    (filter #3)   — Spyware/trackers
 *   • AdGuard Annoyances Filter  (filter #14)  — Popups/redirects
 *   • EasyList                                 — Community standard
 *   • EasyPrivacy                              — Privacy/tracking
 */

const FILTER_SOURCES = [
  {
    name: "AdGuard Base Filter",
    url: "https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_2_Base/filter.txt",
  },
  {
    name: "AdGuard Mobile Ads",
    url: "https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_11_Mobile/filter.txt",
  },
  {
    name: "AdGuard Tracking Protection",
    url: "https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_3_Spyware/filter.txt",
  },
  {
    name: "AdGuard Annoyances (Popups)",
    url: "https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_14_Annoyances/filter.txt",
  },
  {
    name: "AdGuard DNS Filter (fast)",
    url: "https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt",
  },
  {
    name: "EasyList",
    url: "https://easylist.to/easylist/easylist.txt",
  },
  {
    name: "EasyPrivacy",
    url: "https://easylist.to/easylist/easyprivacy.txt",
  },
];

// Bloom filter parameters — 0.1% false positive rate for ~180,000 domains
const N = 180000;
const P = 0.001;
const M = Math.ceil(-(N * Math.log(P)) / Math.log(2) ** 2);
const K = Math.round((M / N) * Math.log(2));
const SIZE_BYTES = Math.ceil(M / 8);

const OUTPUT_BIN = path.join(process.cwd(), "public", "filter.bin");
const IOS_JSON = path.join(process.cwd(), "ios", "App", "App", "adblock-rules.json");
const ANDROID_JSON = path.join(
  process.cwd(), "android", "app", "src", "main", "assets", "adblock-rules.json"
);
const IOS_POPUP_JSON = path.join(process.cwd(), "ios", "App", "App", "popup-rules.json");
const ANDROID_POPUP_JSON = path.join(
  process.cwd(), "android", "app", "src", "main", "assets", "popup-rules.json"
);


// Domains whitelisted — NEVER block these regardless of filter lists
const WHITELIST = new Set([
  "api.themoviedb.org", "image.tmdb.org",
  "player.videasy.net", "vidsrc.to", "vidsrc.xyz", "vidsrc.cc",
  "vidsrc.me", "vidsrc.net", "vidsrc.io", "vidsrc.in",
  "embed.su", "multiembed.mov", "autoembed.co", "vixsrc.to",
  "fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net",
  "unpkg.com", "localhost",
]);

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
      res.on("error", reject);
    }).on("error", reject);
  });
}

/**
 * Parse AdGuard/ABP format filter rules.
 * Extracts pure domain-level blocks from ||domain.com^ rules.
 */
function parseDomains(content) {
  const domains = new Set();
  for (let line of content.split("\n")) {
    line = line.trim();
    if (!line || line.startsWith("!") || line.startsWith("[") || line.startsWith("#")) continue;

    // Standard domain block: ||example.com^
    if (line.startsWith("||") && line.includes("^")) {
      // Strip options after $
      const caret = line.indexOf("^");
      const domain = line.substring(2, caret);
      if (
        domain &&
        !domain.includes("/") &&
        !domain.includes("*") &&
        !domain.includes(" ") &&
        domain.includes(".") &&
        !WHITELIST.has(domain.toLowerCase())
      ) {
        domains.add(domain.toLowerCase());
      }
    }
  }
  return domains;
}

/**
 * Parse AdGuard/ABP $popup and $document rules.
 * These are the rules that specifically target popup/redirect windows.
 * This is what makes AdGuard's popup blocker so effective — it knows
 * WHICH domains are popup sources vs legitimate navigations.
 */
function parsePopupDomains(content) {
  const popupDomains = new Set();
  for (let line of content.split("\n")) {
    line = line.trim();
    if (!line || line.startsWith("!") || line.startsWith("[") || line.startsWith("#")) continue;

    // Rules with $popup, $document, or $all modifiers
    const hasPopupModifier = /\$(.*,)?(popup|document|all)(,|$)/i.test(line);
    if (!hasPopupModifier) continue;

    // Extract domain from ||domain.com^ pattern
    if (line.startsWith("||") && line.includes("^")) {
      const caret = line.indexOf("^");
      const domain = line.substring(2, caret);
      if (
        domain &&
        !domain.includes("/") &&
        !domain.includes("*") &&
        !domain.includes(" ") &&
        domain.includes(".") &&
        !WHITELIST.has(domain.toLowerCase())
      ) {
        popupDomains.add(domain.toLowerCase());
      }
    }
  }
  return popupDomains;
}

// FNV-1a hash (must match sw.js)
function hash(str, seed) {
  let h = 0x811c9dc5 ^ seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function run() {
  console.log("🛡️  Nextflix Shield — AdGuard Filter Compiler");
  console.log("================================================");

  const allDomains = new Set();
  const allPopupDomains = new Set();

  for (const source of FILTER_SOURCES) {
    try {
      console.log(`\n📡 Fetching: ${source.name}`);
      const content = await fetchText(source.url);
      const domains = parseDomains(content);
      const popupDomains = parsePopupDomains(content);
      domains.forEach((d) => allDomains.add(d));
      popupDomains.forEach((d) => allPopupDomains.add(d));
      console.log(`   ✅ +${domains.size.toLocaleString()} domains, +${popupDomains.size.toLocaleString()} popup rules`);
      console.log(`   📊 Running total: ${allDomains.size.toLocaleString()} domains, ${allPopupDomains.size.toLocaleString()} popup rules`);
    } catch (err) {
      console.warn(`   ⚠️  Failed to fetch ${source.name}: ${err.message}`);
    }
  }

  if (allDomains.size === 0) {
    console.error("❌ No domains collected. Aborting.");
    process.exit(1);
  }

  const totalDomains = [...allDomains];
  const totalPopupDomains = [...allPopupDomains];
  console.log(`\n✨ Total unique domains: ${totalDomains.length.toLocaleString()}`);
  console.log(`🚫 Total popup/redirect domains: ${totalPopupDomains.length.toLocaleString()}`);

  // ─── 1. BUILD BLOOM FILTER BINARY ───────────────────────────────
  console.log("\n📦 Compiling Bloom Filter binary...");
  const bloomBuffer = Buffer.alloc(SIZE_BYTES);
  const bitCount = SIZE_BYTES * 8;

  for (const domain of totalDomains) {
    for (let i = 0; i < K; i++) {
      const idx = hash(domain, i) % bitCount;
      bloomBuffer[idx >> 3] |= 1 << (idx % 8);
    }
  }

  // Header: [Magic 'NFSD'][M: uint32LE][K: uint32LE]
  const header = Buffer.alloc(12);
  Buffer.from("NFSD").copy(header);
  header.writeUInt32LE(M, 4);
  header.writeUInt32LE(K, 8);

  const final = Buffer.concat([header, bloomBuffer]);
  ensureDir(OUTPUT_BIN);
  fs.writeFileSync(OUTPUT_BIN, final);
  console.log(`   ✅ ${OUTPUT_BIN}`);
  console.log(`   📦 Size: ${(final.length / 1024).toFixed(1)} KB`);
  console.log(`   🎯 False positive rate: ${(P * 100).toFixed(1)}%`);

  // ─── 2. GENERATE NATIVE JSON RULES ──────────────────────────────
  // Apple's WKContentRuleList + Android WebView has a ~50k rule limit
  // We take the most impactful rules (first 45k)
  console.log("\n📱 Generating native content rules (iOS + Android)...");
  const nativeDomains = totalDomains.slice(0, 45000);

  const rules = nativeDomains.map((domain) => ({
    trigger: {
      "url-filter": `[a-z]*://(.*\\.)?${domain.replace(/\./g, "\\.")}`,
      "load-type": ["third-party"],
    },
    action: {
      type: "block",
    },
  }));

  const rulesJson = JSON.stringify(rules);
  ensureDir(IOS_JSON);
  ensureDir(ANDROID_JSON);
  fs.writeFileSync(IOS_JSON, rulesJson);
  fs.writeFileSync(ANDROID_JSON, rulesJson);
  console.log(`   ✅ iOS:     ${IOS_JSON}`);
  console.log(`   ✅ Android: ${ANDROID_JSON}`);
  console.log(`   📋 Rules:   ${rules.length.toLocaleString()}`);

  // ─── 3. GENERATE POPUP RULES (Intelligence Shield) ─────────────
  // Compact domain list for the window.open proxy inside WebView frames.
  // These domains will be injected as window.__SHIELD_POPUP_DOMAINS__
  // and checked by the Intelligence Shield's window.open interceptor.
  console.log("\n🚫 Generating popup rules (Intelligence Shield)...");

  // Also add the hardcoded fast-path ad domains from MainActivity
  const hardcodedAdDomains = [
    "rtmark.net", "104processors.net", "yandex.ru",
    "tarzansaminate.cfd", "streameeeeee.site",
    "doubleclick.net", "googlesyndication.com",
    "taboola.com", "outbrain.com", "popads.net", "popcash.net",
    "propellerads.com", "exoclick.com", "trafficjunky.net",
    "juicyads.com", "hilltopads.net", "adsterra.com",
    "bidvertiser.com", "yllix.com", "clickadu.com",
    "scorecardresearch.com", "quantserve.com", "omtrdc.net",
    "adsrvr.org", "rubiconproject.com", "casalemedia.com",
    "openx.net", "pubmatic.com", "criteo.com",
  ];
  hardcodedAdDomains.forEach((d) => allPopupDomains.add(d));

  const popupRulesJson = JSON.stringify([...allPopupDomains]);
  ensureDir(IOS_POPUP_JSON);
  ensureDir(ANDROID_POPUP_JSON);
  fs.writeFileSync(IOS_POPUP_JSON, popupRulesJson);
  fs.writeFileSync(ANDROID_POPUP_JSON, popupRulesJson);
  console.log(`   ✅ iOS:     ${IOS_POPUP_JSON}`);
  console.log(`   ✅ Android: ${ANDROID_POPUP_JSON}`);
  console.log(`   🚫 Popup domains: ${allPopupDomains.size.toLocaleString()}`);

  console.log("\n🎉 Shield compilation complete!");
  console.log("================================================");
  console.log(`🛡️  AdGuard-grade protection: ${totalDomains.length.toLocaleString()} domains`);
  console.log(`🚫 Intelligence Shield (popup): ${allPopupDomains.size.toLocaleString()} popup domains`);
  console.log(`⚡ Service Worker: O(1) Bloom filter lookups`);
  console.log(`📱 Native layers: ${rules.length.toLocaleString()} content rules`);
}

run().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
