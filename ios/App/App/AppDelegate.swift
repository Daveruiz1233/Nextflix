import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, WKNavigationDelegate, WKUIDelegate {

    var window: UIWindow?

    // ═══════════════════════════════════════════════════════════════════
    // NUCLEAR SHIELD INJECTION — v3.1 (Softened for Interactivity)
    // ═══════════════════════════════════════════════════════════════════
    private let shieldScript = """
    (function() {
        'use strict';

        // 1. Skip main Capacitor frame to avoid RETRO_ERR
        if (window.self === window.top &&
            (window.Capacitor !== undefined || window.__capacitor__ !== undefined)) {
            return;
        }

        // 2. Kill window.open (The core "Nuclear" block)
        window.open = function(url) {
            console.warn('[Shield] window.open BLOCKED');
            return { closed: true, focus: function(){}, close: function(){}, postMessage: function(){} };
        };

        // 3. Global Click Interception (Selective Link Blocking)
        // Only blocks <a> tags that try to escape the app environment
        var killEvent = function(e) {
            var el = e.target;
            while (el) {
                if (el.tagName === 'A') {
                    var h = el.getAttribute('href') || '';
                    var t = el.getAttribute('target') || '';
                    // Only block if it's an external escape attempt via target=_blank/top
                    if ((t === '_blank' || t === '_top' || t === '_parent') && 
                        h.indexOf('localhost') === -1 && h.indexOf('capacitor') === -1) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        console.warn('[Shield] Escaping link blocked');
                    }
                    break;
                }
                el = el.parentElement;
            }
        };
        
        document.addEventListener('click', killEvent, true);
        // Note: mousedown and touchstart removed to restore player touch controls

        // 4. MutationObserver — Kill ad elements & meta-refresh
        try {
            var observer = new MutationObserver(function(mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    var added = mutations[i].addedNodes;
                    for (var j = 0; j < added.length; j++) {
                        var node = added[j];
                        if (node.tagName === 'META' && (node.getAttribute('http-equiv') || '').toLowerCase() === 'refresh') {
                            node.remove();
                            console.warn('[Shield] meta-refresh REMOVED');
                        }
                    }
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        } catch(e) {}

        // 5. Subtitle Bridge — Force-sync into Native Player
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

        console.log('[Shield v3.1 ✓] Iron Dome Active');
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

        print("🛡️ [Shield v3.1] Nuclear mode Softened — Subtitle Bridge engine running")
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
    // STANDARD DELEGATES (CLEANED)
    // ═══════════════════════════════════════════════════════════════════
    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    // GLOBAL SAFARI LOCK: This prevents ANY window creation.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, 
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        print("🚫 [Shield] createWebViewWith BLOCKED (Lockdown Active)")
        return nil 
    }

    // GLOBAL FIREWALL: Cancels all non-local navigation and escapes.
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
        
        // Block tab creation
        if navigationAction.targetFrame == nil {
            print("🚫 [Shield] Blocked new window: \(url)")
            decisionHandler(.cancel)
            return
        }
        
        // Block main frame escape
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
