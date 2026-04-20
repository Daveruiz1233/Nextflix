import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, WKNavigationDelegate {

    var window: UIWindow?
    private static let TAG = "NextflixShield"

    // MARK: - AdGuard-style injection script
    // This is the same approach AdGuard uses: inject JS into EVERY frame
    // to intercept location changes, window.open, etc.
    private let shieldScript = """
    (function() {
        'use strict';

        // --- PHASE 1: Location Hijack Blocker ---
        // Intercept all attempts to change window.location
        var _allowedOrigins = ['localhost', 'capacitor'];

        function isAllowed(url) {
            if (!url) return true;
            for (var i = 0; i < _allowedOrigins.length; i++) {
                if (url.indexOf(_allowedOrigins[i]) !== -1) return true;
            }
            return false;
        }

        // Intercept location.href setter
        try {
            var locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
            if (!locationDescriptor || locationDescriptor.configurable) {
                Object.defineProperty(window, 'location', {
                    get: function() { return window._realLocation || location; },
                    set: function(url) {
                        if (isAllowed(String(url))) {
                            window._realLocation = url;
                        } else {
                            console.warn('[Shield] Blocked location.href redirect to: ' + url);
                            window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.shieldLog && window.webkit.messageHandlers.shieldLog.postMessage('BLOCKED:' + url);
                        }
                    },
                    configurable: true
                });
            }
        } catch(e) {}

        // --- PHASE 2: window.open() Killer ---
        var _origOpen = window.open;
        window.open = function(url, target, features) {
            var urlStr = url ? String(url) : '';
            if (!isAllowed(urlStr)) {
                console.warn('[Shield] Blocked window.open: ' + urlStr);
                // Report to native layer
                window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.shieldLog && window.webkit.messageHandlers.shieldLog.postMessage('BLOCKED_OPEN:' + urlStr);
                return { focus: function(){}, close: function(){}, closed: true };
            }
            return _origOpen ? _origOpen.apply(window, arguments) : null;
        };

        // --- PHASE 3: document.createElement('a').click() blocker ---
        var _origClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function() {
            var href = this.href || '';
            if (!isAllowed(href) && href !== '' && href !== '#') {
                console.warn('[Shield] Blocked anchor click: ' + href);
                return;
            }
            return _origClick.apply(this, arguments);
        };

        // --- PHASE 4: setTimeout redirect buster ---
        // Some ads use setTimeout(() => location.href = '...', 0)
        var _origSetTimeout = window.setTimeout;
        window.setTimeout = function(fn, delay) {
            var wrappedFn = fn;
            if (typeof fn === 'string') {
                // Eval attack - block strings that look like redirects
                if (fn.indexOf('location') !== -1 || fn.indexOf('window.open') !== -1) {
                    console.warn('[Shield] Blocked eval-timeout redirect');
                    return 0;
                }
            }
            return _origSetTimeout.apply(window, arguments);
        };

        console.log('[Shield] AdGuard-style injection active');
    })();
    """

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        attachShieldToWebView()
    }

    // MARK: - Core Shield Attachment
    private func attachShieldToWebView() {
        guard let rootVC = window?.rootViewController as? CAPBridgeViewController,
              let webView = rootVC.bridge?.webView else { return }

        // 1. Set navigation delegate for top-level redirect blocking
        webView.navigationDelegate = self

        // 2. Inject AdGuard-style script into EVERY frame (including iframes)
        let userScript = WKUserScript(
            source: shieldScript,
            injectionTime: .atDocumentStart,  // Fires BEFORE any ad scripts load
            forMainFrameOnly: false            // KEY: applies to ALL sub-frames/iframes too
        )

        // Add script to the webView's content controller
        let contentController = webView.configuration.userContentController

        // Remove old scripts first to avoid duplicates
        contentController.removeAllUserScripts()
        contentController.addUserScript(userScript)

        // 3. Load AdGuard-compatible content rule list for network-level blocking
        if let rulesPath = Bundle.main.path(forResource: "adblock-rules", ofType: "json"),
           let rulesString = try? String(contentsOfFile: rulesPath) {
            WKContentRuleListStore.default().compileContentRuleList(
                forIdentifier: "NextflixShield",
                encodedContentRuleList: rulesString
            ) { contentRuleList, error in
                if let list = contentRuleList {
                    DispatchQueue.main.async {
                        webView.configuration.userContentController.add(list)
                        print("✅ [Shield] Network-level content rules active")
                    }
                } else if let error = error {
                    print("⚠️ [Shield] Content rules error: \(error.localizedDescription)")
                }
            }
        }

        print("🛡️ [Shield] AdGuard-style protection active on all frames")
    }

    // MARK: - WKNavigationDelegate: Top-level redirect blocker
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {

        let url = navigationAction.request.url?.absoluteString ?? ""
        let isMainFrame = navigationAction.targetFrame?.isMainFrame == true

        // Block all external navigations of the main frame
        // (sub-frame navigations like video iframes are allowed)
        if isMainFrame {
            if !url.contains("localhost") && !url.contains("capacitor://") && !url.isEmpty {
                print("🚫 [Shield] Main-frame hijack BLOCKED: \(url)")
                decisionHandler(.cancel)
                return
            }
        }

        decisionHandler(.allow)
    }

    // MARK: - Standard App Delegate
    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
