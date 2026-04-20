import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, WKNavigationDelegate, WKUIDelegate {

    var window: UIWindow?

    // ═══════════════════════════════════════════════════════════════════
    // SHIELD INJECTION SCRIPT
    // Injected at document-start into EVERY frame (main + all iframes)
    // Patches ALL JavaScript redirect vectors before ad scripts can run
    // ═══════════════════════════════════════════════════════════════════
    private let shieldScript = """
    (function() {
        'use strict';

        var _allowed = ['localhost', '127.0.0.1', 'capacitor://'];

        function isOk(url) {
            if (!url || url === '' || url === '#') return true;
            var s = String(url);
            if (s.startsWith('blob:') || s.startsWith('data:') || s.startsWith('about:') || s.startsWith('javascript:')) return true;
            for (var i = 0; i < _allowed.length; i++) {
                if (s.indexOf(_allowed[i]) !== -1) return true;
            }
            return false;
        }

        // ── 1. location.href setter ──────────────────────────────────
        try {
            var desc = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
            if (desc && desc.set) {
                var origSetter = desc.set;
                Object.defineProperty(Location.prototype, 'href', {
                    get: desc.get,
                    set: function(url) {
                        if (isOk(String(url))) { origSetter.call(this, url); }
                        else { console.warn('[Shield] Blocked location.href =', url); }
                    },
                    configurable: true
                });
            }
        } catch(e) {}

        // ── 2. location.replace() ────────────────────────────────────
        try {
            var origReplace = Location.prototype.replace;
            Location.prototype.replace = function(url) {
                if (isOk(String(url))) { return origReplace.call(this, url); }
                console.warn('[Shield] Blocked location.replace:', url);
            };
        } catch(e) {}

        // ── 3. location.assign() ─────────────────────────────────────
        try {
            var origAssign = Location.prototype.assign;
            Location.prototype.assign = function(url) {
                if (isOk(String(url))) { return origAssign.call(this, url); }
                console.warn('[Shield] Blocked location.assign:', url);
            };
        } catch(e) {}

        // ── 4. window.open() ─────────────────────────────────────────
        // THE MAIN CAUSE OF SAFARI OPENING — kill this completely
        window.open = function(url, target, features) {
            console.warn('[Shield] Blocked window.open:', url);
            return { closed: true, focus: function(){}, close: function(){},
                     postMessage: function(){}, location: { href: '' } };
        };

        // ── 5. <a> click with target="_blank" ────────────────────────
        document.addEventListener('click', function(e) {
            var el = e.target;
            while (el) {
                if (el.tagName === 'A') {
                    var href = el.getAttribute('href') || '';
                    var target = el.getAttribute('target') || '';
                    if (target === '_blank' || target === '_top' || target === '_parent') {
                        if (!isOk(href)) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            console.warn('[Shield] Blocked _blank link:', href);
                            return false;
                        }
                    }
                    break;
                }
                el = el.parentElement;
            }
        }, true);

        // ── 6. Fake anchor click blocker ─────────────────────────────
        var origAnchorClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function() {
            var href = this.href || '';
            if (!isOk(href)) {
                console.warn('[Shield] Blocked synthetic anchor click:', href);
                return;
            }
            return origAnchorClick.call(this);
        };

        // ── 7. setTimeout eval-string redirect blocker ───────────────
        var origST = window.setTimeout;
        window.setTimeout = function(fn, delay) {
            if (typeof fn === 'string' &&
                (fn.indexOf('location') !== -1 || fn.indexOf('open') !== -1 || fn.indexOf('href') !== -1)) {
                console.warn('[Shield] Blocked eval-setTimeout redirect');
                return 0;
            }
            return origST.apply(window, arguments);
        };

        // ── 8. dispatchEvent navigation blocker ──────────────────────
        // Some ads fire custom events that trigger navigation
        var origDispatch = EventTarget.prototype.dispatchEvent;
        EventTarget.prototype.dispatchEvent = function(event) {
            if (event && event.type === 'click') {
                var tgt = this;
                if (tgt.tagName === 'A' && tgt.href && !isOk(tgt.href)) {
                    console.warn('[Shield] Blocked dispatchEvent click on link:', tgt.href);
                    return false;
                }
            }
            return origDispatch.call(this, event);
        };

        console.log('[Shield ✓] All redirect vectors patched');
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

        // ── Navigation delegate: blocks main-frame redirects
        webView.navigationDelegate = self

        // ── UI delegate: THE KEY — blocks window.open() at the native level
        webView.uiDelegate = self

        // ── JS injection into every frame at document-start
        let userScript = WKUserScript(
            source: shieldScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false  // Applies to ALL iframes too
        )
        let cc = webView.configuration.userContentController
        cc.removeAllUserScripts()
        cc.addUserScript(userScript)

        // ── Network-level content rules (WKContentRuleList)
        // These block requests before they even reach JavaScript
        loadContentRules(for: webView)

        print("🛡️ [Shield] All 4 protection layers active")
    }

    private func loadContentRules(for webView: WKWebView) {
        guard let rulesPath = Bundle.main.path(forResource: "adblock-rules", ofType: "json"),
              let rulesString = try? String(contentsOfFile: rulesPath) else {
            print("⚠️ [Shield] No adblock-rules.json found")
            return
        }

        // Check if already compiled (avoid recompiling on every foreground)
        WKContentRuleListStore.default().lookUpContentRuleList(forIdentifier: "NextflixShield") { existing, _ in
            if let list = existing {
                DispatchQueue.main.async {
                    webView.configuration.userContentController.add(list)
                    print("✅ [Shield] Content rules loaded from cache")
                }
            } else {
                // First run: compile
                WKContentRuleListStore.default().compileContentRuleList(
                    forIdentifier: "NextflixShield",
                    encodedContentRuleList: rulesString
                ) { list, error in
                    DispatchQueue.main.async {
                        if let list = list {
                            webView.configuration.userContentController.add(list)
                            print("✅ [Shield] Content rules compiled and active")
                        } else {
                            print("⚠️ [Shield] Content rules compile error: \(error?.localizedDescription ?? "unknown")")
                        }
                    }
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // WKNavigationDelegate — Blocks main-frame redirects
    // ═══════════════════════════════════════════════════════════════════
    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {

        let url = navigationAction.request.url
        let urlStr = url?.absoluteString ?? ""
        let scheme = url?.scheme?.lowercased() ?? ""

        // ── Block dangerous/external URL schemes
        // These cause iOS to open Safari or other apps
        let safeSchemes: Set<String> = ["http", "https", "capacitor", "ionic", "about", "blob", "data", ""]
        if !safeSchemes.contains(scheme) {
            print("🚫 [Shield] Blocked external scheme '\(scheme)': \(urlStr)")
            decisionHandler(.cancel)
            return
        }

        // ── CRITICAL FIX: targetFrame == nil means window.open() new tab
        // Without this, window.open() calls escape to Safari
        if navigationAction.targetFrame == nil {
            print("🚫 [Shield] Blocked new-window navigation: \(urlStr)")
            decisionHandler(.cancel)
            return
        }

        // ── Block main-frame redirects away from our app
        if navigationAction.targetFrame?.isMainFrame == true {
            let isOurApp = urlStr.contains("localhost") ||
                           urlStr.contains("127.0.0.1") ||
                           urlStr.hasPrefix("capacitor://") ||
                           urlStr.hasPrefix("about:") ||
                           urlStr.isEmpty
            if !isOurApp {
                print("🚫 [Shield] Blocked main-frame redirect: \(urlStr)")
                decisionHandler(.cancel)
                return
            }
        }

        decisionHandler(.allow)
    }

    // ═══════════════════════════════════════════════════════════════════
    // WKUIDelegate — THE CRITICAL MISSING PIECE
    // Called when JavaScript calls window.open() or clicks target="_blank"
    // Returning nil = BLOCK the new window completely
    // Without this, iOS opens Safari for every window.open() call
    // ═══════════════════════════════════════════════════════════════════
    func webView(_ webView: WKWebView,
                 createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        let url = navigationAction.request.url?.absoluteString ?? ""
        print("🚫 [Shield] Blocked window.open() / new tab: \(url)")
        return nil  // nil = blocked. If we returned a WKWebView, it would open in-app.
    }

    // ═══════════════════════════════════════════════════════════════════
    // STANDARD APP DELEGATE
    // ═══════════════════════════════════════════════════════════════════
    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity,
                                                           restorationHandler: restorationHandler)
    }
}
