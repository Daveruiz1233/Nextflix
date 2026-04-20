import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, WKNavigationDelegate {

    var window: UIWindow?
    private static let TAG = "NextflixShield"

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Load and Compile the Native AdBlock Shield
        if let rulesPath = Bundle.main.path(forResource: "adblock-rules", ofType: "json"),
           let rulesString = try? String(contentsOfFile: rulesPath) {
            
            WKContentRuleListStore.default().compileContentRuleList(
                forIdentifier: "NextflixShield",
                encodedContentRuleList: rulesString
            ) { [weak self] (contentRuleList, error) in
                if let list = contentRuleList {
                    print("✅ iOS Native Domain Shield Active")
                    // Note: We'll attach the navigation delegate as well
                    DispatchQueue.main.async {
                        self?.attachShieldToWebView()
                    }
                }
            }
        }
        return true
    }

    private func attachShieldToWebView() {
        // Find the Capacitor Webview and attach the redirect killer
        if let rootVC = window?.rootViewController as? CAPBridgeViewController,
           let webView = rootVC.bridge?.webView {
            webView.navigationDelegate = self
            print("🛑 iOS Redirect Firewall Active")
        }
    }

    // 🛑 Redirect Firewall: Intercepts all top-level navigations
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        
        let url = navigationAction.request.url?.absoluteString ?? ""
        
        // If it's a main-frame navigation and NOT our app origin, it's a hijack attempt
        if navigationAction.targetFrame?.isMainFrame == true {
            if !url.contains("localhost") && !url.contains("capacitor://") {
                print("🚫 iOS HIJACK ATTEMPT BLOCKED: \(url)")
                decisionHandler(.cancel)
                return
            }
        }
        
        decisionHandler(.allow)
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Ensure shield is attached if not already
        attachShieldToWebView()
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
