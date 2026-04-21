import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, WKNavigationDelegate, WKUIDelegate {

    var window: UIWindow?

    // ══════════════════════════════════════════════════════════════════
    // INTELLIGENCE SHIELD JS — v4.1 (The Ghostbuster)
    // ══════════════════════════════════════════════════════════════════
    private let shieldScript = """
    (function() {
        'use strict';
        if ((window.self === window.top) && (typeof window.Capacitor !== 'undefined' || typeof window.__capacitor__ !== 'undefined')) { return; }
        if (window.__SHIELD_ARMED__) return;
        window.__SHIELD_ARMED__ = true;

        // 1. Ghostbuster: Overlay Nuker (Kills invisible interaction traps)
        function ghostbuster() {
            try {
                var all = document.querySelectorAll('div,section,span');
                for (var i = 0; i < all.length; i++) {
                    var n = all[i];
                    var s = getComputedStyle(n);
                    var zi = parseInt(s.zIndex) || 0;
                    var op = parseFloat(s.opacity) || 1;
                    var vis = s.visibility;
                    var bg = s.backgroundColor;
                    if (zi > 1000 && n.offsetWidth > window.innerWidth * 0.9 && n.offsetHeight > window.innerHeight * 0.9) {
                        if (op < 0.2 || bg === 'rgba(0, 0, 0, 0)' || vis === 'hidden') {
                            console.warn('[Shield] Vaporized Ghost Overlay:', n.tagName, zi);
                            n.remove();
                        }
                    }
                }
            } catch (e) {}
        }
        setInterval(ghostbuster, 800);

        // 2. Native Spoofing (Bypass AdBlock Detectors)
        function spoof(fn, str) { try { fn.toString = function() { return str; }; } catch (e) {} }

        // 3. Decoy Window Factory
        function createDecoyWindow() {
            var d = {
                closed: false, opener: window,
                location: { href: 'about:blank', replace: function() {}, assign: function() {} },
                document: { write: function() {}, close: function() {}, readyState: 'complete' },
                focus: function() {}, blur: function() {}, close: function() { d.closed = true; },
                postMessage: function() {}, addEventListener: function() {}, removeEventListener: function() {},
                dispatchEvent: function() { return true; }, setTimeout: function() { return 0; },
                setInterval: function() { return 0; }, clearTimeout: function() {}, clearInterval: function() {}
            };
            return d;
        }

        // 4. Build popup domain lookup
        var popupSet = new Set();
        try { var inj = window.__SHIELD_POPUP_DOMAINS__ || []; for (var i = 0; i < inj.length; i++) { popupSet.add(inj[i]); } } catch (e) {}
        var safeSet = new Set(['vidsrc.to','vidsrc.me','vidsrc.net','vidsrc.io','vidsrc.in','player.videasy.net','embed.su']);
        function extractHost(u) { try { if (!u || u.indexOf('://') === -1) return null; return u.split('://')[1].split('/')[0].split(':')[0].toLowerCase(); } catch (e) { return null; } }
        function isBlocked(h) { if (!h) return false; if (popupSet.has(h)) return true; var p = h.split('.'); for (var i = 1; i < p.length-1; i++) { if (popupSet.has(p.slice(i).join('.'))) return true; } return false; }

        // 5. Intelligent window.open Proxy (with Spoofing)
        var nativeOpen = window.open;
        window.open = function(url, target, features) {
            try {
                var s = String(url || '');
                if (!s || s === 'about:blank' || s.charAt(0) === '/') { return nativeOpen ? nativeOpen.call(window, url, target, features) : createDecoyWindow(); }
                var h = extractHost(s);
                if (!h || s.indexOf('localhost') !== -1 || safeSet.has(h) || !isBlocked(h)) {
                    return nativeOpen ? nativeOpen.call(window, url, target, features) : createDecoyWindow();
                }
                console.warn('[Shield] Redirect Blocked:', h);
                return createDecoyWindow();
            } catch (e) { return createDecoyWindow(); }
        };
        spoof(window.open, 'function open() { [native code] }');

        // 6. Selective Link Interception
        document.addEventListener('click', function(e) {
            var el = e.target;
            while (el) {
                if (el.tagName === 'A') {
                    var h = el.getAttribute('href') || '';
                    var t = el.getAttribute('target') || '';
                    if ((t === '_blank' || t === '_top') && h.indexOf('localhost') === -1 && h.indexOf('capacitor') === -1) {
                        var lh = extractHost(h);
                        if (!lh || !safeSet.has(lh)) { e.preventDefault(); e.stopImmediatePropagation(); }
                    }
                    break;
                }
                el = el.parentElement;
            }
        }, true);

        // 7. MutationObserver
        try {
            var mo = new MutationObserver(function(ms) {
                ghostbuster();
                for (var i = 0; i < ms.length; i++) {
                    var a = ms[i].addedNodes;
                    for (var j = 0; j < a.length; j++) {
                        var n = a[j];
                        if (n.nodeType !== 1) continue;
                        if (n.tagName === 'META' && (n.getAttribute('http-equiv') || '').toLowerCase() === 'refresh') { n.remove(); }
                        if (n.tagName === 'IFRAME') {
                            var w = n.offsetWidth; var ht = n.offsetHeight;
                            if (w <= 1 || ht <= 1) n.remove();
                        }
                    }
                }
            });
            mo.observe(document.documentElement, { childList: true, subtree: true });
        } catch (e) {}

        // 8. Subtitle Bridge
        (function() {
            var sy = new Set();
            setInterval(function() {
                var v = document.querySelector('video');
                var a = window.art?.option?.subtitle || window.art?.option?.subtitles;
                if (!v || !a) return;
                var l = Array.isArray(a) ? a : [a];
                l.forEach(function(t) {
                    if (t.url && !sy.has(t.url)) {
                        var tr = document.createElement('track');
                        tr.kind = 'subtitles';
                        tr.label = t.name || t.label || 'Sub';
                        tr.src = t.url;
                        v.appendChild(tr);
                        sy.add(t.url);
                    }
                });
            }, 3000);
        })();

        console.log('[Shield v4.1 Ghostbuster 👻] AdGuard-mode Active');
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
