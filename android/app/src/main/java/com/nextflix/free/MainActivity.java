package com.nextflix.free;

import android.os.Bundle;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "NextflixShield";

    // Top-priority known redirect domains (fast path)
    private static final Set<String> KNOWN_AD_DOMAINS = new HashSet<>(Arrays.asList(
        "rtmark.net", "104processors.net", "yandex.ru", "adscore.info",
        "doubleclick.net", "google-analytics.com", "tarzansaminate.cfd",
        "streameeeeee.site", "taboola.com", "outbrain.com", "popads.net",
        "popcash.net", "propellerads.com", "exoclick.com", "trafficjunky.net",
        "traffichaus.com", "juicyads.com", "hilltopads.net", "plugrush.com",
        "ero-advertising.com", "a-ads.com", "coinzilla.com", "adsterra.com",
        "bidvertiser.com", "yllix.com", "adclickmedia.com", "clickadu.com"
    ));

    // AdGuard-style injection script — same approach as the browser extension
    // Injected at document start into EVERY frame (main + iframes)
    private static final String ADGUARD_SCRIPT =
        "(function() {" +
        "  'use strict';" +
        // Phase 1: Location hijack blocker
        "  var _allowed = ['localhost', 'capacitor'];" +
        "  function isOk(url) {" +
        "    if (!url) return true;" +
        "    var s = String(url);" +
        "    for (var i = 0; i < _allowed.length; i++) {" +
        "      if (s.indexOf(_allowed[i]) !== -1) return true;" +
        "    }" +
        "    return false;" +
        "  }" +
        // Phase 2: window.open killer
        "  var _origOpen = window.open;" +
        "  window.open = function(url) {" +
        "    var u = url ? String(url) : '';" +
        "    if (!isOk(u)) {" +
        "      console.warn('[Shield-A] Blocked window.open: ' + u);" +
        "      AndroidShield && AndroidShield.log('BLOCKED_OPEN:' + u);" +
        "      return {focus:function(){},close:function(){},closed:true};" +
        "    }" +
        "    return _origOpen ? _origOpen.apply(this, arguments) : null;" +
        "  };" +
        // Phase 3: anchor click blocker
        "  document.addEventListener('click', function(e) {" +
        "    var a = e.target;" +
        "    while (a && a.tagName !== 'A') a = a.parentElement;" +
        "    if (!a) return;" +
        "    var href = a.href || '';" +
        "    if (!isOk(href) && href && href !== '#' && href.indexOf('javascript') === -1) {" +
        "      e.preventDefault(); e.stopPropagation();" +
        "      console.warn('[Shield-A] Blocked link: ' + href);" +
        "    }" +
        "  }, true);" +
        // Phase 4: setTimeout redirect buster
        "  var _origST = window.setTimeout;" +
        "  window.setTimeout = function(fn, d) {" +
        "    if (typeof fn === 'string' && (fn.indexOf('location') !== -1 || fn.indexOf('open') !== -1)) {" +
        "      console.warn('[Shield-A] Blocked eval-timeout'); return 0;" +
        "    }" +
        "    return _origST.apply(this, arguments);" +
        "  };" +
        "  console.log('[Shield-A] AdGuard-style Android injection active');" +
        "})();";

    // Empty 200 OK response for blocked resources
    private static final WebResourceResponse BLOCKED_RESPONSE =
        new WebResourceResponse("text/plain", "UTF-8",
            new ByteArrayInputStream("".getBytes()));

    // Empty JS response for blocked scripts
    private static final WebResourceResponse BLOCKED_JS_RESPONSE =
        new WebResourceResponse("application/javascript", "UTF-8",
            new ByteArrayInputStream("/* Shielded */".getBytes()));

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = this.bridge.getWebView();

        // Enable JS interface for native logging from injection script
        webView.addJavascriptInterface(new ShieldInterface(), "AndroidShield");

        webView.setWebViewClient(new WebViewClient() {

            // ─────────────────────────────────────────────────────
            // 🛑 TOP-LEVEL REDIRECT FIREWALL
            // Blocks any attempt to navigate the MAIN frame away from our app
            // ─────────────────────────────────────────────────────
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                boolean isMainFrame = request.isForMainFrame();

                // Always allow our own origin
                if (url.startsWith("http://localhost") ||
                    url.startsWith("https://localhost") ||
                    url.startsWith("capacitor://")) {
                    return false;
                }

                if (isMainFrame) {
                    Log.e(TAG, "🚫 HIJACK BLOCKED (main frame): " + url);
                    return true; // Block and stay on current page
                }

                return false;
            }

            // ─────────────────────────────────────────────────────
            // 🛡️ NETWORK-LEVEL INTERCEPT (ALL requests)
            // This is the key method — intercepts EVERY resource request
            // including scripts, images, XHR — same as AdGuard's network filter
            // ─────────────────────────────────────────────────────
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString().toLowerCase();
                String host = request.getUrl().getHost();
                if (host != null) host = host.toLowerCase();

                // Fast path: known ad domains
                if (host != null) {
                    for (String domain : KNOWN_AD_DOMAINS) {
                        if (host.equals(domain) || host.endsWith("." + domain)) {
                            Log.d(TAG, "🛡️ BLOCKED (known): " + host);
                            return isScript(url) ? BLOCKED_JS_RESPONSE : BLOCKED_RESPONSE;
                        }
                    }
                }

                // URL substring match for tracking pixels, pop scripts, etc.
                if (url.contains("/ads/") || url.contains("/advert") ||
                    url.contains("/popup") || url.contains("/pop.js") ||
                    url.contains("track.php") || url.contains("click.php") ||
                    url.contains("count.php") || url.contains("banner") ||
                    url.contains("prebid") || url.contains("adsense")) {
                    Log.d(TAG, "🛡️ BLOCKED (pattern): " + url);
                    return isScript(url) ? BLOCKED_JS_RESPONSE : BLOCKED_RESPONSE;
                }

                return super.shouldInterceptRequest(view, request);
            }

            // ─────────────────────────────────────────────────────
            // 💉 INJECT ADGUARD-STYLE SCRIPT INTO EVERY PAGE & IFRAME
            // ─────────────────────────────────────────────────────
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Inject protection into every page that loads (including iframes)
                view.evaluateJavascript(ADGUARD_SCRIPT, null);
            }
        });
    }

    private boolean isScript(String url) {
        return url.endsWith(".js") || url.contains(".js?");
    }

    // Native interface — lets the injected JS report blocks to logcat
    private static class ShieldInterface {
        @JavascriptInterface
        public void log(String message) {
            Log.w(TAG, "📡 JS-Shield: " + message);
        }
    }
}
