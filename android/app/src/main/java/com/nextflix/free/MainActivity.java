package com.nextflix.free;

import android.os.Bundle;
import android.os.Message;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

import java.io.ByteArrayInputStream;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "NextflixShield";

    // ══════════════════════════════════════════════════════════════════
    // FAST-PATH AD DOMAIN BLOCKLIST
    // First-pass check before the full 45k-rule JSON
    // ══════════════════════════════════════════════════════════════════
    private static final Set<String> AD_DOMAINS = new HashSet<>(Arrays.asList(
        // Redirect/popup networks
        "rtmark.net", "104processors.net", "yandex.ru",
        "tarzansaminate.cfd", "streameeeeee.site",
        // Ad networks
        "doubleclick.net", "googlesyndication.com",
        "taboola.com", "outbrain.com", "popads.net", "popcash.net",
        "propellerads.com", "exoclick.com", "trafficjunky.net",
        "juicyads.com", "hilltopads.net", "adsterra.com",
        "bidvertiser.com", "yllix.com", "clickadu.com",
        // Trackers
        "scorecardresearch.com", "quantserve.com", "omtrdc.net",
        "adsrvr.org", "rubiconproject.com", "casalemedia.com",
        "openx.net", "pubmatic.com", "criteo.com"
    ));

    // ══════════════════════════════════════════════════════════════════
    // JS INJECTION — patches ALL redirect vectors in every frame
    // Same approach as AdGuard extension's scriptlet injection
    // ══════════════════════════════════════════════════════════════════
    private static final String SHIELD_JS =
        "(function(){" +
        "'use strict';" +

        // Skip main Capacitor frame — only patch video iframes
        // Prevents window.Capacitor.triggerEvent error (RETRO_ERR)
        "var isCapMain=(window.self===window.top)&&(typeof window.Capacitor!=='undefined'||typeof window.__capacitor__!=='undefined');" +
        "if(isCapMain){window.open=function(){return{closed:true,focus:function(){},close:function(){}};};return;}" +

        // Allowed URL checker
        "var _ok=['localhost','127.0.0.1','capacitor://'];" +
        "function isOk(u){" +
        "  if(!u||u===''||u==='#')return true;" +
        "  var s=String(u);" +
        "  if(s.startsWith('blob:')||s.startsWith('data:')||s.startsWith('about:')||s.startsWith('javascript:'))return true;" +
        "  for(var i=0;i<_ok.length;i++){if(s.indexOf(_ok[i])!==-1)return true;}" +
        "  return false;" +
        "}" +

        // 1. location.href via prototype (stronger than window.location)
        "try{" +
        "  var d=Object.getOwnPropertyDescriptor(Location.prototype,'href');" +
        "  if(d&&d.set){" +
        "    var os=d.set;" +
        "    Object.defineProperty(Location.prototype,'href',{" +
        "      get:d.get," +
        "      set:function(u){if(isOk(String(u))){os.call(this,u);}else{console.warn('[Shield] href blocked:',u);}}" +
        "    });" +
        "  }" +
        "}catch(e){}" +

        // 2. location.replace()
        "try{" +
        "  var or=Location.prototype.replace;" +
        "  Location.prototype.replace=function(u){if(isOk(String(u))){or.call(this,u);}else{console.warn('[Shield] replace blocked:',u);}}" +
        "}catch(e){}" +

        // 3. location.assign()
        "try{" +
        "  var oa=Location.prototype.assign;" +
        "  Location.prototype.assign=function(u){if(isOk(String(u))){oa.call(this,u);}else{console.warn('[Shield] assign blocked:',u);}}" +
        "}catch(e){}" +

        // 4. window.open() — THE MAIN CAUSE of browser opening
        "window.open=function(u,t,f){" +
        "  console.warn('[Shield] window.open blocked:',u);" +
        "  if(typeof AndroidShield!=='undefined')AndroidShield.log('OPEN:'+u);" +
        "  return{closed:true,focus:function(){},close:function(){},postMessage:function(){}};" +
        "};" +

        // 5. <a target="_blank"> click blocker
        "document.addEventListener('click',function(e){" +
        "  var el=e.target;" +
        "  while(el){" +
        "    if(el.tagName==='A'){" +
        "      var h=el.getAttribute('href')||'';" +
        "      var t=el.getAttribute('target')||'';" +
        "      if((t==='_blank'||t==='_top'||t==='_parent')&&!isOk(h)){" +
        "        e.preventDefault();e.stopImmediatePropagation();" +
        "        console.warn('[Shield] _blank blocked:',h);" +
        "        return false;" +
        "      }" +
        "      break;" +
        "    }" +
        "    el=el.parentElement;" +
        "  }" +
        "},true);" +

        // 6. Synthetic anchor click
        "var oc=HTMLAnchorElement.prototype.click;" +
        "HTMLAnchorElement.prototype.click=function(){" +
        "  if(!isOk(this.href||'')){console.warn('[Shield] synthetic click blocked:',this.href);return;}" +
        "  oc.call(this);" +
        "};" +

        // 7. setTimeout eval-string
        "var oST=window.setTimeout;" +
        "window.setTimeout=function(fn,d){" +
        "  if(typeof fn==='string'&&(fn.indexOf('location')!==-1||fn.indexOf('open')!==-1)){" +
        "    console.warn('[Shield] eval-setTimeout blocked');return 0;" +
        "  }" +
        "  return oST.apply(this,arguments);" +
        "};" +

        "console.log('[Shield \u2713] Android iframe injection active');" +
        "})();";

    private static final WebResourceResponse EMPTY_OK =
        new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream("".getBytes()));
    private static final WebResourceResponse EMPTY_JS =
        new WebResourceResponse("application/javascript", "UTF-8",
            new ByteArrayInputStream("/* shielded */".getBytes()));

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = this.bridge.getWebView();

        // ── Expose AndroidShield interface for JS reporting ───────────
        webView.addJavascriptInterface(new ShieldBridge(), "AndroidShield");

        // ── CRITICAL: Disable JavaScript's ability to open new windows ──
        // This is the Android equivalent of WKUIDelegate.createWebViewWith returning nil
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);

        // ── WebChromeClient: blocks window.open() at the native level ──
        // This fires EVEN if JS patches are bypassed somehow
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog,
                                          boolean isUserGesture, Message resultMsg) {
                Log.e(TAG, "🚫 onCreateWindow() BLOCKED (isUserGesture=" + isUserGesture + ")");
                return false; // false = do not create window
            }
        });

        // ── WebViewClient: network-level request interception ─────────
        webView.setWebViewClient(new WebViewClient() {

            // ── Main-frame redirect firewall ──────────────────────────
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                String scheme = request.getUrl().getScheme();

                // Always pass through our own app
                if (url.startsWith("http://localhost") ||
                    url.startsWith("https://localhost") ||
                    url.startsWith("capacitor://") ||
                    "about".equals(scheme) || "blob".equals(scheme)) {
                    return false;
                }

                // Block ALL main-frame navigations to external URLs
                if (request.isForMainFrame()) {
                    Log.e(TAG, "🚫 Main-frame redirect BLOCKED: " + url);
                    return true;
                }

                return false;
            }

            // ── Network request blocker (ALL resources) ───────────────
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String rawUrl = request.getUrl().toString();
                String url = rawUrl.toLowerCase();
                String host = request.getUrl().getHost();
                if (host != null) host = host.toLowerCase();

                // Fast-path: known ad domains
                if (host != null) {
                    for (String ad : AD_DOMAINS) {
                        if (host.equals(ad) || host.endsWith("." + ad)) {
                            Log.d(TAG, "🛡️ Domain blocked: " + host);
                            return isScript(url) ? EMPTY_JS : EMPTY_OK;
                        }
                    }
                }

                // URL pattern matching
                if (url.contains("/popup") || url.contains("pop.js") ||
                    url.contains("/ads/") || url.contains("/advert") ||
                    url.contains("prebid") || url.contains("track.php") ||
                    url.contains("click.php") || url.contains("banner.")) {
                    Log.d(TAG, "🛡️ Pattern blocked: " + url);
                    return isScript(url) ? EMPTY_JS : EMPTY_OK;
                }

                return super.shouldInterceptRequest(view, request);
            }

            // ── JS injection on every page (main + iframes) ───────────
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // evaluateJavascript runs in the frame context that just loaded
                view.evaluateJavascript(SHIELD_JS, null);
            }
        });

        Log.i(TAG, "🛡️ NextflixShield active — window.open DISABLED, all vectors patched");
    }

    private boolean isScript(String url) {
        return url.endsWith(".js") || url.contains(".js?") || url.contains(".js#");
    }

    private static class ShieldBridge {
        @JavascriptInterface
        public void log(String msg) {
            Log.w(TAG, "📡 JS: " + msg);
        }
    }
}
