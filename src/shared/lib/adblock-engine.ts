/**
 * Nextflix Shield — Main Thread Engine
 * High-performance Bloom Filter AdBlocker for Mobile (Capacitor).
 * This reinforces the Service Worker which can be restricted in native WebViews.
 */

class AdblockEngine {
  private filterBuffer: Uint8Array | null = null;
  private m: number = 0;
  private k: number = 0;
  private isInitialized: boolean = false;
  private blockedCount: number = 0;

  constructor() {
    if (typeof window === "undefined") return;
    this.init();
  }

  private async init() {
    try {
      const response = await fetch("/filter.bin");
      if (!response.ok) throw new Error("Failed to load filter binary");
      
      const arrayBuffer = await response.arrayBuffer();
      const view = new DataView(arrayBuffer);

      // Check Magic 'NFSD'
      const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
      if (magic !== "NFSD") throw new Error("Invalid filter format");

      this.m = view.getUint32(4, true);
      this.k = view.getUint32(8, true);
      this.filterBuffer = new Uint8Array(arrayBuffer, 12);
      this.isInitialized = true;
      
      console.log(`[Nextflix Shield] Main-thread firewall engaged: ${this.m} bits.`);
      this.armShield();
    } catch (err) {
      console.warn("[Nextflix Shield] Main-thread initialization failed:", err);
    }
  }

  private hash(str: string, seed: number): number {
    let h = 0x811c9dc5 ^ seed;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return Math.abs(h);
  }

  private checkFilter(str: string): boolean {
    if (!this.filterBuffer) return false;
    for (let i = 0; i < this.k; i++) {
      const h = this.hash(str, i) % this.m;
      if (!(this.filterBuffer[h >> 3] & (1 << (h % 8)))) return false;
    }
    return true;
  }

  public isBlocked(url: string): boolean {
    if (!this.isInitialized) return false;
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname === window.location.hostname) return false;

      const parts = hostname.split(".");
      for (let i = 0; i < parts.length - 1; i++) {
        const domain = parts.slice(i).join(".");
        if (this.checkFilter(domain)) return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  private armShield() {
    const self = this;

    // 1. Monkey-patch window.open (The Popup Killer)
    const originalOpen = window.open;
    window.open = function (...args: any[]) {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.toString() || "";
      if (self.isBlocked(url)) {
        console.warn("[Shield] Blocked popup:", url);
        self.blockedCount++;
        self.notifyUI();
        return {
          closed: true,
          close: () => {},
          focus: () => {},
          blur: () => {},
          postMessage: () => {},
          opener: window,
        } as unknown as Window;
      }
      return originalOpen.apply(window, args as any);
    };

    // 2. Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = function (...args: any[]) {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
      if (self.isBlocked(url)) {
        console.warn("[Shield] Blocked fetch:", url);
        self.blockedCount++;
        self.notifyUI();
        return Promise.resolve(new Response("", { status: 200, statusText: "OK (Shielded)" }));
      }
      return originalFetch.apply(window, args as any);
    };

    // 3. Intercept XHR
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: any[]) {
      const url = args[1];
      if (typeof url === "string" && self.isBlocked(url)) {
        console.warn("[Shield] Blocked XHR:", url);
        self.blockedCount++;
        self.notifyUI();
        // Redirect to a local safe endpoint or just abort
        return originalXHROpen.apply(this, [args[0], "/api/shield-blocked", ...args.slice(2)] as any);
      }
      return originalXHROpen.apply(this, args as any);
    };

    // 4. Global Link Guard
    document.addEventListener("click", (e) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (anchor && anchor.href && !anchor.href.startsWith(window.location.origin)) {
        if (self.isBlocked(anchor.href)) {
          e.preventDefault();
          e.stopPropagation();
          console.warn("[Shield] Blocked navigation:", anchor.href);
          self.blockedCount++;
          self.notifyUI();
        }
      }
    }, true);
  }

  private notifyUI() {
    window.dispatchEvent(new CustomEvent("AD_BLOCKED", { detail: { count: this.blockedCount } }));
  }

  public getBlockedCount(): number {
    return this.blockedCount;
  }
}

// Singleton pattern
export const adblockEngine = typeof window !== "undefined" ? new AdblockEngine() : ({} as AdblockEngine);
