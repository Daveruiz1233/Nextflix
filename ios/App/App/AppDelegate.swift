import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, WKNavigationDelegate, WKUIDelegate {

    var window: UIWindow?

    // ═══════════════════════════════════════════════════════════════════
    // SHIELD INJECTION SCRIPT
    // Injected at document-start into EVERY frame (main + all iframes)
    // KEY: Skips patching the main Capacitor frame to avoid breaking
    //      window.Capacitor.triggerEvent (the RETRO_ERR you were seeing)
    // ═══════════════════════════════════════════════════════════════════
    private let shieldScript = """
    (function() {
        'use strict';

        // Only patch sub-frames (ad iframes). The main Capacitor frame
        // must not be patched — it breaks window.Capacitor.triggerEvent.
        var isMainCapacitorFrame = (window.self === window.top) &&
                                   (window.Capacitor !== undefined ||
                                    window.__capacitor__ !== undefined);

        if (isMainCapacitorFrame) {
            // Still kill window.open in the main frame (safe to do)
            window.open = function() {
                return { closed: true, focus: function(){}, close: function(){} };
            };
            return;
        }

        // ── From here on: only runs inside cross-origin video iframes ──

        var _ok = ['localhost', '127.0.0.1', 'capacitor://'];

        function isOk(u) {
            if (!u || u === '' || u === '#') return true;
            var s = String(u);
            if (s.indexOf('blob:') === 0 || s.indexOf('data:') === 0 ||
                s.indexOf('about:') === 0 || s.indexOf('javascript:') === 0) return true;
            for (var i = 0; i < _ok.length; i++) {
                if (s.indexOf(_ok[i]) !== -1) return true;
            }
            return false;
        }

        // 1. location.href via prototype (can't be bypassed)
        try {
            var d = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
            if (d && d.set) {
                var os = d.set;
                Object.defineProperty(Location.prototype, 'href', {
                    get: d.get,
                    set: function(u) {
                        if (isOk(String(u))) { os.call(this, u); }
                        else { console.warn('[Shield] href blocked:', u); }
                    },
                    configurable: true
                });
            }
        } catch(e) {}

        // 2. location.replace()
        try {
            var or1 = Location.prototype.replace;
            Location.prototype.replace = function(u) {
                if (isOk(String(u))) { return or1.call(this, u); }
                console.warn('[Shield] replace blocked:', u);
            };
        } catch(e) {}

        // 3. location.assign()
        try {
            var or2 = Location.prototype.assign;
            Location.prototype.assign = function(u) {
                if (isOk(String(u))) { return or2.call(this, u); }
                console.warn('[Shield] assign blocked:', u);
            };
        } catch(e) {}

        // 4. window.open() — THE cause of Safari opening
        window.open = function(url) {
            console.warn('[Shield] window.open blocked:', url);
            return { closed: true, focus: function(){}, close: function(){},
                     postMessage: function(){}, location: { href: '' } };
        };

        // 5. <a target="_blank"> click blocker
        document.addEventListener('click', function(e) {
            var el = e.target;
            while (el) {
                if (el.tagName === 'A') {
                    var h = el.getAttribute('href') || '';
                    var t = el.getAttribute('target') || '';
                    if ((t === '_blank' || t === '_top' || t === '_parent') && !isOk(h)) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        console.warn('[Shield] _blank blocked:', h);
                        return false;
                    }
                    break;
                }
                el = el.parentElement;
            }
        }, true);

        // 6. Synthetic anchor click
        var oClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function() {
            if (!isOk(this.href || '')) {
                console.warn('[Shield] synthetic click blocked:', this.href);
                return;
            }
            oClick.call(this);
        };

        // 7. setTimeout eval-string redirect
        var oST = window.setTimeout;
        window.setTimeout = function(fn, delay) {
            if (typeof fn === 'string' &&
                (fn.indexOf('location') !== -1 || fn.indexOf('open') !== -1)) {
                console.warn('[Shield] eval-setTimeout blocked');
                return 0;
            }
            return oST.apply(window, arguments);
        };

        console.log('[Shield ✓] iframe redirect vectors patched');
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
    // SHIELD ATTACHMENT (runs once)
    // ═══════════════════════════════════════════════════════════════════
    private var shieldAttached = false

    private func attachShield() {
        guard !shieldAttached,
              let rootVC = window?.rootViewController as? CAPBridgeViewController,
              let webView = rootVC.bridge?.webView else { return }

        shieldAttached = true

        webView.navigationDelegate = self
        webView.uiDelegate = self  // KEY — intercepts window.open()

        let userScript = WKUserScript(
            source: shieldScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false  // Runs in all sub-frames too
        )
        let cc = webView.configuration.userContentController
        cc.removeAllUserScripts()
        cc.addUserScript(userScript)

        loadContentRules(for: webView)

        print("🛡️ [Shield] Active — RETRO_ERR fix applied, all redirect vectors patched")
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
    // WKNavigationDelegate
    // ═══════════════════════════════════════════════════════════════════
    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {

        let url = navigationAction.request.url
        let urlStr = url?.absoluteString ?? ""
        let scheme = url?.scheme?.lowercased() ?? ""

        // Block dangerous non-web schemes (would open Safari/App Store/etc.)
        let safeSchemes: Set<String> = ["http", "https", "capacitor", "ionic", "about", "blob", "data", ""]
        if !safeSchemes.contains(scheme) {
            print("🚫 [Shield] Blocked scheme '\(scheme)': \(urlStr)")
            decisionHandler(.cancel)
            return
        }

        // CRITICAL: targetFrame == nil = window.open() new tab → block
        if navigationAction.targetFrame == nil {
            print("🚫 [Shield] Blocked new-window (targetFrame nil): \(urlStr)")
            decisionHandler(.cancel)
            return
        }

        // Block main-frame navigations away from our app
        if navigationAction.targetFrame?.isMainFrame == true {
            let isOurApp = urlStr.contains("localhost") ||
                           urlStr.hasPrefix("capacitor://") ||
                           urlStr.hasPrefix("about:") ||
                           urlStr.isEmpty
            if !isOurApp {
                print("🚫 [Shield] Main-frame redirect blocked: \(urlStr)")
                decisionHandler(.cancel)
                return
            }
        }

        decisionHandler(.allow)
    }

    // ═══════════════════════════════════════════════════════════════════
    // WKUIDelegate — THE CRITICAL PIECE
    // Called when ANY JS calls window.open() or clicks target="_blank"
    // Returning nil = completely blocked (no Safari, no new tab, nothing)
    // ═══════════════════════════════════════════════════════════════════
    func webView(_ webView: WKWebView,
                 createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        print("🚫 [Shield] window.open() blocked: \(navigationAction.request.url?.absoluteString ?? "")")
        return nil
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
