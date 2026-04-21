import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, WKNavigationDelegate, WKUIDelegate {

    var window: UIWindow?

    // ═══════════════════════════════════════════════════════════════════
    // INTELLIGENCE SHIELD — v4.0 (AdGuard Parity)
    //
    // Instead of blocking EVERYTHING (which kills player controls),
    // this uses the same strategy as AdGuard's browser extension:
    //   1. Decoy Window Factory — fakes blocked popups so scripts don't crash
    //   2. Filter-driven window.open proxy — checks popup-rules.json
    //   3. Selective click interception — only blocks <a> escapes, NOT touches
    //   4. MutationObserver — removes meta-refresh and zero-size iframes
    //   5. Subtitle Bridge — syncs VidSrc tracks into native player
    //
    // The key insight: AdGuard NEVER blocks mousedown/touchstart globally.
    // It only intercepts the RESULT of those events (window.open calls).
    // ═══════════════════════════════════════════════════════════════════
    private let shieldScript = """
    (function() {
        'use strict';

        // ── Guard: Skip the Capacitor main frame ──────────────────────
        if (window.self === window.top &&
            (window.Capacitor !== undefined || window.__capacitor__ !== undefined)) {
            return;
        }

        // Prevent double-injection
        if (window.__SHIELD_ARMED__) return;
        window.__SHIELD_ARMED__ = true;

        // ── 1. Decoy Window Factory (AdGuard pattern) ─────────────────
        // When we block a popup, we return a convincing fake Window object.
        // This prevents the calling script from crashing or retrying.
        function createDecoyWindow() {
            var decoy = {
                closed: false,
                opener: window,
                location: { href: 'about:blank', replace: function(){}, assign: function(){} },
                document: { write: function(){}, close: function(){}, readyState: 'complete' },
                focus: function() {},
                blur: function() {},
                close: function() { decoy.closed = true; },
                postMessage: function() {},
                addEventListener: function() {},
                removeEventListener: function() {},
                dispatchEvent: function() { return true; },
                setTimeout: function() { return 0; },
                setInterval: function() { return 0; },
                clearTimeout: function() {},
                clearInterval: function() {}
            };
            return decoy;
        }

        // ── 2. Build popup domain lookup from injected rules ──────────
        // The native layer injects window.__SHIELD_POPUP_DOMAINS__ as an array
        // of domains extracted from AdGuard's $popup filter rules.
        var popupSet = new Set();
        try {
            var injected = window.__SHIELD_POPUP_DOMAINS__ || [];
            for (var i = 0; i < injected.length; i++) {
                popupSet.add(injected[i]);
            }
        } catch(e) {}

        // Known safe streaming domains that should NEVER be blocked
        var safeDomains = [
            'vidsrc.to', 'vidsrc.me', 'vidsrc.net', 'vidsrc.io', 'vidsrc.in',
            'vidsrc.xyz', 'vidsrc.cc', 'player.videasy.net', 'embed.su',
            'multiembed.mov', 'autoembed.co', 'vixsrc.to',
            'api.themoviedb.org', 'image.tmdb.org'
        ];
        var safeSet = new Set(safeDomains);

        function extractHost(url) {
            try {
                if (!url || url.indexOf('://') === -1) return null;
                var a = url.split('://')[1];
                if (!a) return null;
                return a.split('/')[0].split(':')[0].toLowerCase();
            } catch(e) { return null; }
        }

        function isDomainBlocked(host) {
            if (!host) return false;
            // Check exact match
            if (popupSet.has(host)) return true;
            // Check parent domain (e.g. sub.adsterra.com → adsterra.com)
            var parts = host.split('.');
            for (var i = 1; i < parts.length - 1; i++) {
                if (popupSet.has(parts.slice(i).join('.'))) return true;
            }
            return false;
        }

        function isDomainSafe(host) {
            if (!host) return false;
            if (safeSet.has(host)) return true;
            var parts = host.split('.');
            for (var i = 1; i < parts.length - 1; i++) {
                if (safeSet.has(parts.slice(i).join('.'))) return true;
            }
            return false;
        }

        // ── 3. Intelligent window.open Proxy ──────────────────────────
        // This is the core of AdGuard's popup blocking:
        //   - If the URL is relative, blob, data, about, or javascript → ALLOW
        //   - If the host is a known safe streaming domain → ALLOW
        //   - If the host matches a popup filter rule → BLOCK with decoy
        //   - Otherwise → BLOCK with decoy (unknown external = likely ad)
        var nativeOpen = window.open;
        window.open = function(url, target, features) {
            try {
                var s = String(url || '');
                // Always allow internal/special URLs
                if (!s || s === 'about:blank' ||
                    s.indexOf('blob:') === 0 || s.indexOf('data:') === 0 ||
                    s.indexOf('javascript:') === 0 || s.charAt(0) === '/') {
                    return nativeOpen ? nativeOpen.call(window, url, target, features) : createDecoyWindow();
                }

                var host = extractHost(s);

                // Allow same-origin
                if (host && (host === location.hostname ||
                    s.indexOf('localhost') !== -1 || s.indexOf('capacitor') !== -1)) {
                    return nativeOpen ? nativeOpen.call(window, url, target, features) : createDecoyWindow();
                }

                // Allow known safe streaming domains
                if (host && isDomainSafe(host)) {
                    return nativeOpen ? nativeOpen.call(window, url, target, features) : createDecoyWindow();
                }

                // Block: matched by AdGuard popup filter
                if (host && isDomainBlocked(host)) {
                    console.warn('[Shield] Popup BLOCKED (AdGuard filter):', host);
                    return createDecoyWindow();
                }

                // Block: unknown external domain (conservative — most are ads)
                console.warn('[Shield] Popup BLOCKED (unknown external):', s);
                return createDecoyWindow();
            } catch(e) {
                return createDecoyWindow();
            }
        };

        // ── 4. Selective Link Escape Interception ─────────────────────
        // Only intercept clicks on <a> tags that try to escape the app.
        // We do NOT touch mousedown or touchstart — those are for the player.
        document.addEventListener('click', function(e) {
            var el = e.target;
            while (el) {
                if (el.tagName === 'A') {
                    var h = el.getAttribute('href') || '';
                    var t = el.getAttribute('target') || '';
                    if ((t === '_blank' || t === '_top' || t === '_parent') &&
                        h.indexOf('localhost') === -1 && h.indexOf('capacitor') === -1) {
                        var linkHost = extractHost(h);
                        if (!linkHost || !isDomainSafe(linkHost)) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            console.warn('[Shield] Link escape blocked:', h);
                        }
                    }
                    break;
                }
                el = el.parentElement;
            }
        }, true);

        // ── 5. MutationObserver — Remove ad artifacts ─────────────────
        try {
            var observer = new MutationObserver(function(mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    var added = mutations[i].addedNodes;
                    for (var j = 0; j < added.length; j++) {
                        var node = added[j];
                        if (node.nodeType !== 1) continue;
                        // Kill meta-refresh redirects
                        if (node.tagName === 'META' &&
                            (node.getAttribute('http-equiv') || '').toLowerCase() === 'refresh') {
                            node.remove();
                            console.warn('[Shield] meta-refresh REMOVED');
                        }
                        // Kill zero-size invisible iframes (ad trackers)
                        if (node.tagName === 'IFRAME') {
                            var w = node.offsetWidth || parseInt(node.style.width || '999');
                            var h = node.offsetHeight || parseInt(node.style.height || '999');
                            if (w <= 1 || h <= 1) {
                                node.remove();
                            }
                        }
                    }
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        } catch(e) {}

        // ── 6. Subtitle Bridge — Sync into Native Player ──────────────
        (function() {
            var synced = new Set();
            setInterval(function() {
                var v = document.querySelector('video');
                var art = window.art?.option?.subtitle || window.art?.option?.subtitles;
                if (!v || !art) return;
                var list = Array.isArray(art) ? art : [art];
                list.forEach(function(t) {
                    if (t.url && !synced.has(t.url)) {
                        var track = document.createElement('track');
                        track.kind = 'subtitles';
                        track.label = t.name || t.label || 'Unknown';
                        track.src = t.url;
                        v.appendChild(track);
                        synced.add(t.url);
                        console.log('[Shield] Subtitle synced:', track.label);
                    }
                });
            }, 3000);
        })();

        console.log('[Shield v4 ✓] Intelligence Shield Active (' + popupSet.size + ' popup rules loaded)');
    })();
    """

    // ═══════════════════════════════════════════════════════════════════
    // APP LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        attachShield()
    }

    // ═══════════════════════════════════════════════════════════════════
    // SHIELD ATTACHMENT
    // ═══════════════════════════════════════════════════════════════════
    private var shieldAttached = false

    private func attachShield() {
        guard !shieldAttached,
              let rootVC = window?.rootViewController as? CAPBridgeViewController,
              let webView = rootVC.bridge?.webView else { return }

        shieldAttached = true

        webView.navigationDelegate = self
        webView.uiDelegate = self

        // Disable link preview long-press (can trigger Safari)
        webView.allowsLinkPreview = false

        // Block inline media playback from opening external Safari
        webView.configuration.preferences.javaScriptCanOpenWindowsAutomatically = false

        // ── Inject popup rules as a global array ──────────────────────
        // This is read by the shield script to populate popupSet
        let popupRulesScript = loadPopupRules()
        let rulesUserScript = WKUserScript(
            source: popupRulesScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )

        // ── Inject main shield ────────────────────────────────────────
        let shieldUserScript = WKUserScript(
            source: shieldScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )

        let cc = webView.configuration.userContentController
        cc.removeAllUserScripts()
        cc.addUserScript(rulesUserScript)
        cc.addUserScript(shieldUserScript)

        loadContentRules(for: webView)

        print("🛡️ [Shield v4] Intelligence Shield — AdGuard Parity Armed")
    }

    private func loadPopupRules() -> String {
        guard let path = Bundle.main.path(forResource: "popup-rules", ofType: "json"),
              let data = try? String(contentsOfFile: path) else {
            print("⚠️ [Shield] popup-rules.json not found, using empty ruleset")
            return "window.__SHIELD_POPUP_DOMAINS__ = [];"
        }
        return "window.__SHIELD_POPUP_DOMAINS__ = \(data);"
    }

    private func loadContentRules(for webView: WKWebView) {
        guard let path = Bundle.main.path(forResource: "adblock-rules", ofType: "json"),
              let rulesString = try? String(contentsOfFile: path) else { return }

        WKContentRuleListStore.default().lookUpContentRuleList(forIdentifier: "NextflixShield") { existing, _ in
            if let list = existing {
                DispatchQueue.main.async { webView.configuration.userContentController.add(list) }
            } else {
                WKContentRuleListStore.default().compileContentRuleList(
                    forIdentifier: "NextflixShield",
                    encodedContentRuleList: rulesString
                ) { list, _ in
                    if let list = list {
                        DispatchQueue.main.async { webView.configuration.userContentController.add(list) }
                    }
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // STANDARD DELEGATES
    // ═══════════════════════════════════════════════════════════════════
    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    // GLOBAL SAFARI LOCK: This prevents ANY new window creation at the native level.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, 
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        print("🚫 [Shield] createWebViewWith BLOCKED (Lockdown Active)")
        return nil 
    }

    // NAVIGATION FIREWALL: Cancels non-local main-frame navigations.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, 
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        
        let url = navigationAction.request.url?.absoluteString ?? ""
        let scheme = navigationAction.request.url?.scheme?.lowercased() ?? ""
        
        let allowed = ["http", "https", "capacitor", "about", "blob", "data", ""]
        if !allowed.contains(scheme) {
            print("🚫 [Shield] Blocked scheme: \(scheme)")
            decisionHandler(.cancel)
            return
        }
        
        // Block new tab/window creation
        if navigationAction.targetFrame == nil {
            print("🚫 [Shield] Blocked new window: \(url)")
            decisionHandler(.cancel)
            return
        }
        
        // Block main frame escape to external sites
        if navigationAction.targetFrame?.isMainFrame == true {
            let isApp = url.contains("localhost") || url.contains("capacitor") || url.isEmpty || url.contains("about:")
            if !isApp {
                print("🚫 [Shield] Blocked exit: \(url)")
                decisionHandler(.cancel)
                return
            }
        }
        
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, 
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        if let resp = navigationResponse.response as? HTTPURLResponse, (300...399).contains(resp.statusCode) {
            if navigationResponse.isForMainFrame {
                print("🚫 [Shield] Redirect blocked")
                decisionHandler(.cancel)
                return
            }
        }
        decisionHandler(.allow)
    }
}
