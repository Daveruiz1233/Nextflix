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
    // ══════════════════════════════════════════════════════════════════
    private static final Set<String> AD_DOMAINS = new HashSet<>(Arrays.asList(
        "rtmark.net", "104processors.net", "yandex.ru",
        "tarzansaminate.cfd", "streameeeeee.site",
        "doubleclick.net", "googlesyndication.com",
        "taboola.com", "outbrain.com", "popads.net", "popcash.net",
        "propellerads.com", "exoclick.com", "trafficjunky.net",
        "juicyads.com", "hilltopads.net", "adsterra.com",
        "bidvertiser.com", "yllix.com", "clickadu.com",
        "scorecardresearch.com", "quantserve.com", "omtrdc.net",
        "adsrvr.org", "rubiconproject.com", "casalemedia.com",
        "openx.net", "pubmatic.com", "criteo.com"
    ));

    // ══════════════════════════════════════════════════════════════════
    // NUCLEAR SHIELD JS — v2.0 (12 vectors + MutationObserver)
    // ══════════════════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════
    // NUCLEAR SHIELD JS — v3.0 (Iron Dome)
    // ══════════════════════════════════════════════════════════════════
    private static final String SHIELD_JS =
        "(function(){" +
        "'use strict';" +

        // 1. Skip main Capacitor frame to avoid RETRO_ERR
        "if((window.self===window.top)&&(typeof window.Capacitor!=='undefined'||typeof window.__capacitor__!=='undefined')){" +
        "window.open=function(){return{closed:true,focus:function(){},close:function(){}};};return;" +
        "}" +

        // 2. Iron Dome: Location Proxying
        "try{" +
        "var hd=Object.getOwnPropertyDescriptor(Location.prototype,'href');" +
        "if(hd&&hd.set){var os=hd.set;" +
        "Object.defineProperty(Location.prototype,'href',{" +
        "get:hd.get," +
        "set:function(u){" +
        "var s=String(u);" +
        "if(s.indexOf('localhost')!==-1||s.indexOf('capacitor')!==-1||s.indexOf('blob:')===0||s.indexOf('data:')===0||s.indexOf('about:')===0){os.call(this,u);}" +
        "else{console.warn('[Shield] Intercepted navigation:',u);}" +
        "},configurable:true});}" +
        "}catch(e){}" +

        "window.open=function(){return{closed:true,focus:function(){},close:function(){},postMessage:function(){}};};" +

        // 3. Global Click & Touch Interception
        "var killEvent=function(e){" +
        "var el=e.target;while(el){" +
        "if(el.tagName==='A'){" +
        "var h=el.getAttribute('href')||'';var t=el.getAttribute('target')||'';" +
        "if((t==='_blank'||t==='_top'||t==='_parent')&&h.indexOf('localhost')===-1&&h.indexOf('capacitor')===-1){" +
        "e.preventDefault();e.stopImmediatePropagation();console.warn('[Shield] Escaping link blocked');" +
        "}break;}" +
        "el=el.parentElement;}};" +
        "document.addEventListener('click',killEvent,true);" +
        "document.addEventListener('mousedown',killEvent,true);" +
        "document.addEventListener('touchstart',killEvent,true);" +

        // 4. MutationObserver
        "try{var mo=new MutationObserver(function(ms){" +
        "for(var i=0;i<ms.length;i++){var a=ms[i].addedNodes;" +
        "for(var j=0;j<a.length;j++){var n=a[j];" +
        "if(n.tagName==='META'&&(n.getAttribute('http-equiv')||'').toLowerCase()==='refresh'){n.remove();}" +
        "if(n.tagName==='IFRAME'){" +
        "var w=n.offsetWidth||parseInt(n.style.width||'999');" +
        "var h=n.offsetHeight||parseInt(n.style.height||'999');" +
        "if(w<=1||h<=1){n.remove();}" +
        "}}}});mo.observe(document.documentElement,{childList:true,subtree:true});}catch(e){}" +

        // 5. Subtitle Bridge
        "(function(){var sy=new Set();setInterval(function(){" +
        "var v=document.querySelector('video');var a=window.art?.option?.subtitle||window.art?.option?.subtitles;" +
        "if(!v||!a)return;var l=Array.isArray(a)?a:[a];" +
        "l.forEach(function(t){if(t.url&&!sy.has(t.url)){" +
        "var tr=document.createElement('track');tr.kind='subtitles';tr.label=t.name||t.label||'Sub';tr.src=t.url;" +
        "v.appendChild(tr);sy.add(t.url);console.log('Synced:',tr.label);}});},3000);})();" +

        "console.log('[Shield v3 ✓] Iron Dome Active');" +
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

        webView.addJavascriptInterface(new ShieldBridge(), "AndroidShield");

        // NUCLEAR: Disable JS's ability to open new windows
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);

        // Block window.open at the native level
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog,
                                          boolean isUserGesture, Message resultMsg) {
                Log.e(TAG, "🚫 onCreateWindow BLOCKED");
                return false;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                String scheme = request.getUrl().getScheme();

                // Allow our own app URLs
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

                // Block known redirect URL patterns in sub-frames too
                String lower = url.toLowerCase();
                if (lower.contains("/popup") || lower.contains("/popunder") ||
                    lower.contains("/clickunder") || lower.contains("ad.php") ||
                    lower.contains("track.php") || lower.contains("/redirect")) {
                    Log.d(TAG, "🛡️ Ad-pattern sub-frame blocked: " + url);
                    return true;
                }

                return false;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String rawUrl = request.getUrl().toString();
                String url = rawUrl.toLowerCase();
                String host = request.getUrl().getHost();
                if (host != null) host = host.toLowerCase();

                // 1. Fast-path: Ad domain blocking
                if (host != null) {
                    for (String ad : AD_DOMAINS) {
                        if (host.equals(ad) || host.endsWith("." + ad)) {
                            return isScript(url) ? EMPTY_JS : EMPTY_OK;
                        }
                    }
                }

                // 2. Pattern blocking
                if (url.contains("/popup") || url.contains("pop.js") ||
                    url.contains("/ads/") || url.contains("/advert") ||
                    url.contains("prebid") || url.contains("track.php") ||
                    url.contains("click.php") || url.contains("banner.") ||
                    url.contains("/redirect") || url.contains("popunder")) {
                    return isScript(url) ? EMPTY_JS : EMPTY_OK;
                }

                // 3. NUCLEAR: Every-Frame Injection Bridge
                // We don't modify the HTML directly here to avoid performance lag,
                // instead we rely on the native browser lock + aggressive evaluateJavascript
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                // Early injection
                view.evaluateJavascript(SHIELD_JS, null);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Late injection & Cleanup
                view.evaluateJavascript(SHIELD_JS, null);
            }
        });

        // ══════════════════════════════════════════════════════════════════
        // Aggressive Sub-frame Injection (WebChromeClient)
        // ══════════════════════════════════════════════════════════════════
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog,
                                          boolean isUserGesture, Message resultMsg) {
                Log.e(TAG, "🚫 onCreateWindow BLOCKED");
                return false;
            }

            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
                // Inject during loading to catch early ad-scripts (15% is usually after headers)
                if (newProgress > 15 && newProgress < 90) {
                    view.evaluateJavascript(SHIELD_JS, null);
                }
            }
        });

        Log.i(TAG, "🛡️ Shield v3 — Iron Dome (Every-Frame Mode) Armed");
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
