import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, WKNavigationDelegate, WKUIDelegate {

    var window: UIWindow?

    // ═══════════════════════════════════════════════════════════════════
    // NUCLEAR SHIELD INJECTION — v3.0 (Strict Isolation)
    // ═══════════════════════════════════════════════════════════════════
    private let shieldScript = """
    (function() {
        'use strict';

        // 1. ABSOLUTE ISOLATION
        // If we are in the main app (localhost/capacitor), EXIT IMMEDIATELY.
        // This prevents collision with the Capacitor Bridge (RETRO_ERR).
        var loc = window.location.href || '';
        if (loc.indexOf('localhost') !== -1 || loc.indexOf('capacitor://') !== -1) {
            // Still kill window.open for safety, but don't patch prototypes
            window.open = function() { return { closed: true, focus: function(){}, close: function(){} }; };
            return;
        }

        // ── Below only runs inside cross-origin video iframes ──

        var _ok = ['localhost', '127.0.0.1', 'capacitor'];
        function isOk(u) {
            if (!u || u === '' || u === '#') return true;
            var s = String(u);
            if (s.indexOf('blob:') === 0 || s.indexOf('data:') === 0 ||
                s.indexOf('about:') === 0 || s.indexOf('javascript:') === 0) return true;
            for (var i = 0; i < _ok.length; i++) { if (s.indexOf(_ok[i]) !== -1) return true; }
            return false;
        }

        // ═══ Prototype Patches ═══
        try {
            var hd = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
            if (hd && hd.set) {
                var _origHrefSet = hd.set;
                Object.defineProperty(Location.prototype, 'href', {
                    get: hd.get,
                    set: function(u) {
                        if (isOk(String(u))) { _origHrefSet.call(this, u); }
                        else { console.warn('[Shield] href blocked'); }
                    },
                    configurable: true
                });
            }
        } catch(e) {}

        try {
            var _origReplace = Location.prototype.replace;
            Location.prototype.replace = function(u) { if (isOk(String(u))) { return _origReplace.call(this, u); } };
            var _origAssign = Location.prototype.assign;
            Location.prototype.assign = function(u) { if (isOk(String(u))) { return _origAssign.call(this, u); } };
        } catch(e) {}

        window.open = function() { return { closed: true, focus: function(){}, close: function(){}, postMessage: function(){}, location: { href: '' } }; };

        document.addEventListener('click', function(e) {
            var el = e.target;
            while (el) {
                if (el.tagName === 'A') {
                    var h = el.getAttribute('href') || '';
                    var t = el.getAttribute('target') || '';
                    if ((t === '_blank' || t === '_top' || t === '_parent') && !isOk(h)) {
                        e.preventDefault(); e.stopImmediatePropagation(); return false;
                    }
                    break;
                }
                el = el.parentElement;
            }
        }, true);

        // ═══ MutationObserver — kill meta-refresh & overlays ═══
        try {
            var observer = new MutationObserver(function(mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    var added = mutations[i].addedNodes;
                    for (var j = 0; j < added.length; j++) {
                        var node = added[j];
                        if (!node.tagName) continue;
                        var tag = node.tagName.toUpperCase();
                        if (tag === 'META' && (node.getAttribute('http-equiv') || '').toLowerCase() === 'refresh') { node.remove(); }
                        if ((tag === 'DIV' || tag === 'A' || tag === 'SPAN') && node.style) {
                            var z = parseInt(node.style.zIndex || '0');
                            var op = parseFloat(node.style.opacity || '1');
                            if (z > 999 && op < 0.1) { node.remove(); }
                        }
                    }
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        } catch(e) {}

        window.addEventListener('message', function(e) {
            if (e.data && (typeof e.data === 'string' || typeof e.data === 'object')) {
                var s = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
                if (s.toLowerCase().indexOf('redirect') !== -1) { e.stopImmediatePropagation(); }
            }
        }, true);

        console.log('[Shield v3 ✓] Isolated iframe protection active');
    })();
    """

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        attachShield()
    }

    private var shieldAttached = false

    private func attachShield() {
        guard !shieldAttached,
              let rootVC = window?.rootViewController as? CAPBridgeViewController,
              let webView = rootVC.bridge?.webView else { return }

        shieldAttached = true
        webView.navigationDelegate = self
        webView.uiDelegate = self

        // 1. FORCE INLINE PLAYBACK (Prevents AVKit takeover)
        webView.configuration.allowsInlineMediaPlayback = true
        webView.configuration.mediaTypesRequiringUserActionForPlayback = []
        webView.allowsLinkPreview = false

        let userScript = WKUserScript(
            source: shieldScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        webView.configuration.userContentController.removeAllUserScripts()
        webView.configuration.userContentController.addUserScript(userScript)

        loadContentRules(for: webView)
        print("🛡️ [Shield v3] Armed and Isolated")
    }

    private func loadContentRules(for webView: WKWebView) {
        guard let path = Bundle.main.path(forResource: "adblock-rules", ofType: "json"),
              let rulesString = try? String(contentsOfFile: path) else { return }

        WKContentRuleListStore.default().compileContentRuleList(
            forIdentifier: "NextflixShield",
            encodedContentRuleList: rulesString
        ) { list, _ in
            if let list = list {
                DispatchQueue.main.async { webView.configuration.userContentController.add(list) }
            }
        }
    }

    // ════ Native Firewall ════
    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {

        let url = navigationAction.request.url
        let urlStr = url?.absoluteString ?? ""
        let scheme = url?.scheme?.lowercased() ?? ""

        // Only allow web schemes
        let safeSchemes: Set<String> = ["http", "https", "capacitor", "about", "blob", "data", ""]
        if !safeSchemes.contains(scheme) {
            decisionHandler(.cancel)
            return
        }

        // Block new windows (window.open)
        if navigationAction.targetFrame == nil {
            decisionHandler(.cancel)
            return
        }

        // Block main-frame escape
        if navigationAction.targetFrame?.isMainFrame == true {
            let isApp = urlStr.contains("localhost") || urlStr.hasPrefix("capacitor://")
            if !isApp {
                decisionHandler(.cancel)
                return
            }
        }

        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView,
                 createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        return nil // Block window.open tabs
    }
}
