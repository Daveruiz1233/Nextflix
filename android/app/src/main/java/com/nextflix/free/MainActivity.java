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

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "NextflixShield";

    // ══════════════════════════════════════════════════════════════════
    // FAST-PATH AD DOMAIN BLOCKLIST (network-level interception)
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
    // INTELLIGENCE SHIELD JS — v4.0 (AdGuard Parity)
    //
    // Same as iOS AppDelegate.swift — uses:
    //   1. Decoy Window Factory
    //   2. Filter-driven window.open proxy
    //   3. Selective click (NOT touch) interception
    //   4. MutationObserver cleanup
    //   5. Subtitle Bridge
    // ══════════════════════════════════════════════════════════════════
    private static final String SHIELD_JS =
        "(function(){" +
        "'use strict';" +

        // Guard: Skip main Capacitor frame
        "if((window.self===window.top)&&(typeof window.Capacitor!=='undefined'||typeof window.__capacitor__!=='undefined')){return;}" +

        // Prevent double-injection
        "if(window.__SHIELD_ARMED__)return;" +
        "window.__SHIELD_ARMED__=true;" +

        // 1. Decoy Window Factory
        "function createDecoyWindow(){" +
        "var d={closed:false,opener:window," +
        "location:{href:'about:blank',replace:function(){},assign:function(){}}," +
        "document:{write:function(){},close:function(){},readyState:'complete'}," +
        "focus:function(){},blur:function(){},close:function(){d.closed=true;}," +
        "postMessage:function(){},addEventListener:function(){},removeEventListener:function(){}," +
        "dispatchEvent:function(){return true;},setTimeout:function(){return 0;}," +
        "setInterval:function(){return 0;},clearTimeout:function(){},clearInterval:function(){}" +
        "};return d;}" +

        // 2. Build popup domain lookup
        "var popupSet=new Set();" +
        "try{var inj=window.__SHIELD_POPUP_DOMAINS__||[];for(var i=0;i<inj.length;i++){popupSet.add(inj[i]);}}catch(e){}" +

        "var safeDomains=['vidsrc.to','vidsrc.me','vidsrc.net','vidsrc.io','vidsrc.in'," +
        "'vidsrc.xyz','vidsrc.cc','player.videasy.net','embed.su'," +
        "'multiembed.mov','autoembed.co','vixsrc.to','api.themoviedb.org','image.tmdb.org'];" +
        "var safeSet=new Set(safeDomains);" +

        "function extractHost(u){" +
        "try{if(!u||u.indexOf('://')===-1)return null;var a=u.split('://')[1];if(!a)return null;return a.split('/')[0].split(':')[0].toLowerCase();}catch(e){return null;}}" +

        "function isDomainBlocked(h){" +
        "if(!h)return false;if(popupSet.has(h))return true;" +
        "var p=h.split('.');for(var i=1;i<p.length-1;i++){if(popupSet.has(p.slice(i).join('.')))return true;}return false;}" +

        "function isDomainSafe(h){" +
        "if(!h)return false;if(safeSet.has(h))return true;" +
        "var p=h.split('.');for(var i=1;i<p.length-1;i++){if(safeSet.has(p.slice(i).join('.')))return true;}return false;}" +

        // 3. Intelligent window.open Proxy
        "var nativeOpen=window.open;" +
        "window.open=function(url,target,features){" +
        "try{" +
        "var s=String(url||'');" +
        "if(!s||s==='about:blank'||s.indexOf('blob:')===0||s.indexOf('data:')===0||s.indexOf('javascript:')===0||s.charAt(0)==='/'){" +
        "return nativeOpen?nativeOpen.call(window,url,target,features):createDecoyWindow();}" +

        "var host=extractHost(s);" +

        "if(host&&(host===location.hostname||s.indexOf('localhost')!==-1||s.indexOf('capacitor')!==-1)){" +
        "return nativeOpen?nativeOpen.call(window,url,target,features):createDecoyWindow();}" +

        "if(host&&isDomainSafe(host)){" +
        "return nativeOpen?nativeOpen.call(window,url,target,features):createDecoyWindow();}" +

        "if(host&&isDomainBlocked(host)){" +
        "console.warn('[Shield] Popup BLOCKED (AdGuard filter):',host);return createDecoyWindow();}" +

        "console.warn('[Shield] Popup BLOCKED (unknown external):',s);return createDecoyWindow();" +
        "}catch(e){return createDecoyWindow();}" +
        "};" +

        // 4. Selective Link Escape Interception (click ONLY, no touch)
        "document.addEventListener('click',function(e){" +
        "var el=e.target;while(el){" +
        "if(el.tagName==='A'){" +
        "var h=el.getAttribute('href')||'';var t=el.getAttribute('target')||'';" +
        "if((t==='_blank'||t==='_top'||t==='_parent')&&h.indexOf('localhost')===-1&&h.indexOf('capacitor')===-1){" +
        "var lh=extractHost(h);if(!lh||!isDomainSafe(lh)){" +
        "e.preventDefault();e.stopImmediatePropagation();console.warn('[Shield] Link escape blocked:',h);}}" +
        "break;}el=el.parentElement;}},true);" +

        // 5. MutationObserver
        "try{var mo=new MutationObserver(function(ms){" +
        "for(var i=0;i<ms.length;i++){var a=ms[i].addedNodes;" +
        "for(var j=0;j<a.length;j++){var n=a[j];if(n.nodeType!==1)continue;" +
        "if(n.tagName==='META'&&(n.getAttribute('http-equiv')||'').toLowerCase()==='refresh'){n.remove();}" +
        "if(n.tagName==='IFRAME'){" +
        "var w=n.offsetWidth||parseInt(n.style.width||'999');" +
        "var ht=n.offsetHeight||parseInt(n.style.height||'999');" +
        "if(w<=1||ht<=1){n.remove();}}" +
        "}}});mo.observe(document.documentElement,{childList:true,subtree:true});}catch(e){}" +

        // 6. Subtitle Bridge
        "(function(){var sy=new Set();setInterval(function(){" +
        "var v=document.querySelector('video');var a=window.art?.option?.subtitle||window.art?.option?.subtitles;" +
        "if(!v||!a)return;var l=Array.isArray(a)?a:[a];" +
        "l.forEach(function(t){if(t.url&&!sy.has(t.url)){" +
        "var tr=document.createElement('track');tr.kind='subtitles';tr.label=t.name||t.label||'Sub';tr.src=t.url;" +
        "v.appendChild(tr);sy.add(t.url);console.log('Synced:',tr.label);}});},3000);})();" +

        "console.log('[Shield v4 ✓] Intelligence Shield Active ('+popupSet.size+' popup rules)');" +
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

        // ── Load popup rules from assets and inject as a global ───────
        String popupRulesJs = loadPopupRules();

        // Block window.open at the native level
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
                // Inject during loading to catch early ad-scripts
                if (newProgress > 15 && newProgress < 90) {
                    view.evaluateJavascript(popupRulesJs, null);
                    view.evaluateJavascript(SHIELD_JS, null);
                }
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

                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                // Inject rules first, then shield
                view.evaluateJavascript(popupRulesJs, null);
                view.evaluateJavascript(SHIELD_JS, null);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Late injection for safety
                view.evaluateJavascript(popupRulesJs, null);
                view.evaluateJavascript(SHIELD_JS, null);
            }
        });

        Log.i(TAG, "🛡️ Shield v4 — Intelligence Shield (AdGuard Parity) Armed");
    }

    /**
     * Load popup-rules.json from assets and wrap it as a JS global assignment.
     */
    private String loadPopupRules() {
        try {
            InputStream is = getAssets().open("popup-rules.json");
            BufferedReader reader = new BufferedReader(new InputStreamReader(is));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            reader.close();
            return "window.__SHIELD_POPUP_DOMAINS__=" + sb.toString() + ";";
        } catch (Exception e) {
            Log.w(TAG, "⚠️ popup-rules.json not found, using empty ruleset");
            return "window.__SHIELD_POPUP_DOMAINS__=[];";
        }
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
