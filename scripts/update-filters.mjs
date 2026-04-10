import fs from "fs";
import path from "path";
import https from "https";

/**
 * Nextflix Shield — High-Performance Bloom Filter Compiler
 * Converts 160,000+ AdGuard rules into a ~300KB binary firewall.
 * False Positive Rate: 0.1% | Optimized for iPhone 6s Plus.
 */

const FILTERS = [
  "https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt",
  "https://filters.adtidy.org/extension/chromium-mv3/filters/19.txt",
];

// Optimal parameters for 160,000 items at 0.1% false positive rate
const N = 170000; // Expected items
const P = 0.001;  // False positive rate (0.1%)
const M = Math.ceil(-(N * Math.log(P)) / (Math.log(2) ** 2)); // ~2,400,000 bits
const K = Math.round((M / N) * Math.log(2)); // ~10 hashes
const SIZE_BYTES = Math.ceil(M / 8);

const OUTPUT_PATH = path.join(process.cwd(), "public", "filter.bin");

async function fetchFilter(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
      res.on("error", (err) => reject(err));
    });
  });
}

function parseRules(content) {
  const domains = new Set();
  const lines = content.split("\n");
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("!") || line.startsWith("[")) continue;
    if (line.startsWith("||") && line.endsWith("^")) {
      const domain = line.substring(2, line.length - 1);
      if (domain && !domain.includes("/") && !domain.includes("*")) {
        domains.add(domain.toLowerCase());
      }
    }
  }
  return domains;
}

// Minimal FNV-1a hash
function hash(str, seed) {
  let h = 0x811c9dc5 ^ seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

async function run() {
  console.log("🛠️  Compiling High-Performance Bloom Filter...");
  const domains = new Set();

  try {
    for (const url of FILTERS) {
      console.log(`📡 Fetching: ${url}`);
      const content = await fetchFilter(url);
      const parsed = parseRules(content);
      parsed.forEach((d) => domains.add(d));
      console.log(`   + Added ${parsed.size} domains`);
    }

    console.log(`✨ Total Unique Domains: ${domains.size}`);
    
    const buffer = Buffer.alloc(SIZE_BYTES);
    const bitCount = SIZE_BYTES * 8;

    for (const domain of domains) {
      for (let i = 0; i < K; i++) {
        const index = hash(domain, i) % bitCount;
        buffer[index >> 3] |= (1 << (index % 8));
      }
    }

    // Include metadata in a header for the Service Worker (Params: m, k)
    // Header format: [Magic: 'NFSD', M: 32bit, K: 32bit]
    const magic = Buffer.from("NFSD");
    const header = Buffer.alloc(magic.length + 8);
    magic.copy(header);
    header.writeUInt32LE(M, 4);
    header.writeUInt32LE(K, 8);

    const finalBuffer = Buffer.concat([header, buffer]);
    fs.writeFileSync(OUTPUT_PATH, finalBuffer);

    console.log(`\n🎉 Compiled successfully to ${OUTPUT_PATH}`);
    console.log(`📦 Final Size: ${(finalBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`🛡️  Protection Level: AdGuard Grade (${domains.size} rules)`);
    console.log(`⚡ Performance: O(1) matching for iPhone 6s Plus`);
  } catch (err) {
    console.error("❌ Fatal Error:", err);
    process.exit(1);
  }
}

run();
