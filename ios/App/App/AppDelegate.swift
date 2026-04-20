import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, WKNavigationDelegate, WKUIDelegate {

    var window: UIWindow?

    // ═══════════════════════════════════════════════════════════════════
    // NUCLEAR SHIELD INJECTION — v2.0
    // Patches 12 redirect vectors + MutationObserver cleanup
    // Injected at document-start into EVERY frame
    // ═══════════════════════════════════════════════════════════════════
    private let shieldScript = """
    (function() {
        'use strict';

        // Skip the main Capacitor frame to avoid RETRO_ERR
        // (Capacitor uses triggerEvent on its own bridge)
        if (window.self === window.top &&
            (window.Capacitor !== undefined || window.__capacitor__ !== undefined)) {
            window.open = function() {
                return { closed: true, focus: function(){}, close: function(){} };
            };
            return;
        }

        // ── Below only runs inside cross-origin video iframes ──

        var _ok = ['localhost', '127.0.0.1', 'capacitor'];

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

        // ═══ 1. location.href (prototype-level, unforgeable) ═══
        try {
            var hd = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
            if (hd && hd.set) {
                var _origHrefSet = hd.set;
                Object.defineProperty(Location.prototype, 'href', {
                    get: hd.get,
                    set: function(u) {
                        if (isOk(String(u))) { _origHrefSet.call(this, u); }
                        else { console.warn('[Shield] href =', u); }
                    },
                    configurable: true
                });
            }
        } catch(e) {}

        // ═══ 2. location.replace() ═══
        try {
            var _origReplace = Location.prototype.replace;
            Location.prototype.replace = function(u) {
                if (isOk(String(u))) { return _origReplace.call(this, u); }
                console.warn('[Shield] replace:', u);
            };
        } catch(e) {}

        // ═══ 3. location.assign() ═══
        try {
            var _origAssign = Location.prototype.assign;
            Location.prototype.assign = function(u) {
                if (isOk(String(u))) { return _origAssign.call(this, u); }
                console.warn('[Shield] assign:', u);
            };
        } catch(e) {}

        // ═══ 4. window.open() — TOTAL KILL ═══
        window.open = function() {
            return { closed: true, focus: function(){}, close: function(){},
                     postMessage: function(){}, location: { href: '' } };
        };

        // ═══ 5. <a> click with target=_blank/_top/_parent ═══
        document.addEventListener('click', function(e) {
            var el = e.target;
            while (el) {
                if (el.tagName === 'A') {
                    var h = el.getAttribute('href') || '';
                    var t = el.getAttribute('target') || '';
                    if ((t === '_blank' || t === '_top' || t === '_parent') && !isOk(h)) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        return false;
                    }
                    break;
                }
                el = el.parentElement;
            }
        }, true);

        // ═══ 6. HTMLAnchorElement.prototype.click ═══
        try {
            var _origAClick = HTMLAnchorElement.prototype.click;
            HTMLAnchorElement.prototype.click = function() {
                if (!isOk(this.href || '')) return;
                _origAClick.call(this);
            };
        } catch(e) {}

        // ═══ 7. setTimeout / setInterval eval-string ═══
        try {
            var _origST = window.setTimeout;
            window.setTimeout = function(fn, delay) {
                if (typeof fn === 'string' &&
                    (fn.indexOf('location') !== -1 || fn.indexOf('open(') !== -1 ||
                     fn.indexOf('href') !== -1 || fn.indexOf('redirect') !== -1)) {
                    return 0;
                }
                return _origST.apply(window, arguments);
            };
            var _origSI = window.setInterval;
            window.setInterval = function(fn, delay) {
                if (typeof fn === 'string' &&
                    (fn.indexOf('location') !== -1 || fn.indexOf('open(') !== -1)) {
                    return 0;
                }
                return _origSI.apply(window, arguments);
            };
        } catch(e) {}

        // ═══ 8. requestAnimationFrame redirect ═══
        // Some ads use rAF to schedule a redirect on the next paint
        try {
            var _origRAF = window.requestAnimationFrame;
            window.requestAnimationFrame = function(fn) {
                if (typeof fn === 'string') return 0; // block string evals
                return _origRAF.apply(window, arguments);
            };
        } catch(e) {}

        // ═══ 9. document.write() injection blocker ═══
        // Ads inject <script> with redirect code via document.write
        try {
            var _origWrite = document.write;
            document.write = function(html) {
                var s = String(html || '').toLowerCase();
                if (s.indexOf('location') !== -1 || s.indexOf('window.open') !== -1 ||
                    s.indexOf('meta http-equiv') !== -1 || s.indexOf('click()') !== -1) {
                    console.warn('[Shield] write blocked');
                    return;
                }
                _origWrite.call(document, html);
            };
            var _origWriteLn = document.writeln;
            document.writeln = function(html) {
                var s = String(html || '').toLowerCase();
                if (s.indexOf('location') !== -1 || s.indexOf('window.open') !== -1) {
                    return;
                }
                _origWriteLn.call(document, html);
            };
        } catch(e) {}

        // ═══ 10. postMessage redirect blocker ═══
        // Some ads send postMessage to parent to trigger navigation
        window.addEventListener('message', function(e) {
            if (e.data && typeof e.data === 'string') {
                var d = e.data.toLowerCase();
                if (d.indexOf('redirect') !== -1 || d.indexOf('navigate') !== -1 ||
                    d.indexOf('location') !== -1 || d.indexOf('window.open') !== -1) {
                    e.stopImmediatePropagation();
                    return;
                }
            }
            if (e.data && typeof e.data === 'object') {
                var str = JSON.stringify(e.data || {}).toLowerCase();
                if (str.indexOf('redirect') !== -1 || str.indexOf('openurl') !== -1) {
                    e.stopImmediatePropagation();
                    return;
                }
            }
        }, true);

        // ═══ 11. MutationObserver — Kill ad-injected elements ═══
        // Removes: invisible clickjacking overlays, meta-refresh, new ad iframes
        try {
            var observer = new MutationObserver(function(mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    var added = mutations[i].addedNodes;
                    for (var j = 0; j < added.length; j++) {
                        var node = added[j];
                        if (!node.tagName) continue;
                        var tag = node.tagName.toUpperCase();

                        // Kill meta-refresh (bypasses ALL JS patches)
                        if (tag === 'META') {
                            var equiv = (node.getAttribute('http-equiv') || '').toLowerCase();
                            if (equiv === 'refresh') {
                                node.remove();
                                console.warn('[Shield] Removed meta-refresh');
                            }
                        }

                        // Kill invisible clickjacking overlays
                        if (tag === 'DIV' || tag === 'A' || tag === 'SPAN') {
                            var style = node.style || {};
                            var pos = style.position || '';
                            var z = parseInt(style.zIndex || '0');
                            var opacity = parseFloat(style.opacity || '1');
                            if ((pos === 'fixed' || pos === 'absolute') && z > 999 && opacity < 0.05) {
                                node.remove();
                                console.warn('[Shield] Removed clickjack overlay');
                            }
                        }

                        // Kill ad iframes (hidden, tiny, or from known ad domains)
                        if (tag === 'IFRAME') {
                            var src = (node.getAttribute('src') || '').toLowerCase();
                            var w = node.offsetWidth || parseInt(node.style.width || '999');
                            var h = node.offsetHeight || parseInt(node.style.height || '999');

                            // Kill zero-size iframes (tracking/redirect beacons)
                            if (w <= 1 || h <= 1) {
                                node.remove();
                                console.warn('[Shield] Removed invisible iframe:', src);
                                continue;
                            }

                            // Kill iframes from known ad patterns
                            if (src.indexOf('ad') !== -1 || src.indexOf('pop') !== -1 ||
                                src.indexOf('click') !== -1 || src.indexOf('track') !== -1 ||
                                src.indexOf('banner') !== -1) {
                                node.remove();
                                console.warn('[Shield] Removed ad iframe:', src);
                            }
                        }
                    }
                }
            });
            observer.observe(document.documentElement || document, {
                childList: true, subtree: true
            });
        } catch(e) {}

        // ═══ 12. beforeunload / unload navigation kill ═══
        window.addEventListener('beforeunload', function(e) {
            // Prevent the page from being navigated away
            e.preventDefault();
            e.returnValue = '';
        }, true);

        console.log('[Shield v2 ✓] 12 vectors patched + MutationObserver active');
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

        let userScript = WKUserScript(
            source: shieldScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        let cc = webView.configuration.userContentController
        cc.removeAllUserScripts()
        cc.addUserScript(userScript)

        loadContentRules(for: webView)

        print("🛡️ [Shield v2] Nuclear mode — 12 vectors + content rules + WKUIDelegate")
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
    // WKNavigationDelegate — Network-level firewall
    // ═══════════════════════════════════════════════════════════════════
    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {

        let url = navigationAction.request.url
        let urlStr = url?.absoluteString ?? ""
        let scheme = url?.scheme?.lowercased() ?? ""

        // Block ALL non-web schemes (itms-appss, tel, mailto, etc.)
        // These are the routes that open Safari/App Store
        let safeSchemes: Set<String> = ["http", "https", "capacitor", "ionic", "about", "blob", "data", ""]
        if !safeSchemes.contains(scheme) {
            print("🚫 [Shield] Blocked scheme '\(scheme)://': \(urlStr)")
            decisionHandler(.cancel)
            return
        }

        // CRITICAL: targetFrame == nil = window.open() new tab → BLOCK
        if navigationAction.targetFrame == nil {
            print("🚫 [Shield] window.open (nil target): \(urlStr)")
            decisionHandler(.cancel)
            return
        }

        // Block ALL main-frame navigations away from our app
        if navigationAction.targetFrame?.isMainFrame == true {
            let isOurApp = urlStr.contains("localhost") ||
                           urlStr.hasPrefix("capacitor://") ||
                           urlStr.hasPrefix("about:") ||
                           urlStr.isEmpty
            if !isOurApp {
                print("🚫 [Shield] Main-frame escape: \(urlStr)")
                decisionHandler(.cancel)
                return
            }
        }

        // Sub-frame URL pattern blocking (catch-all for ad iframes)
        let pathLower = urlStr.lowercased()
        if pathLower.contains("/popup") || pathLower.contains("/popunder") ||
           pathLower.contains("/clickunder") || pathLower.contains("ad.php") ||
           pathLower.contains("ads.php") || pathLower.contains("track.php") ||
           pathLower.contains("/redirect") {
            print("🚫 [Shield] Ad-pattern URL: \(urlStr)")
            decisionHandler(.cancel)
            return
        }

        decisionHandler(.allow)
    }

    // Block server-initiated redirects too (HTTP 3xx)
    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationResponse: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {

        if let response = navigationResponse.response as? HTTPURLResponse,
           (300...399).contains(response.statusCode) {
            let url = response.url?.absoluteString ?? ""
            if navigationResponse.isForMainFrame &&
               !url.contains("localhost") && !url.hasPrefix("capacitor://") {
                print("🚫 [Shield] 3xx redirect blocked: \(url)")
                decisionHandler(.cancel)
                return
            }
        }

        decisionHandler(.allow)
    }

    // ═══════════════════════════════════════════════════════════════════
    // WKUIDelegate — KILLS window.open() at the native level
    // This is THE piece that prevents Safari from ever opening
    // ═══════════════════════════════════════════════════════════════════
    func webView(_ webView: WKWebView,
                 createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        return nil  // nil = NEVER create a new window/tab
    }

    // Block JavaScript alerts/confirms from ad scripts
    func webView(_ webView: WKWebView,
                 runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping () -> Void) {
        // Only allow alerts from our own app
        if frame.request.url?.host?.contains("localhost") == true {
            // We could show a native alert here, but for now just dismiss
        }
        completionHandler()
    }

    func webView(_ webView: WKWebView,
                 runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (Bool) -> Void) {
        completionHandler(false)
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
