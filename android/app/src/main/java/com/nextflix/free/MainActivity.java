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
        "vsembed.ru", "cloudnestra.com", "2embed.biz", "zplayer.live",
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
    // INTELLIGENCE SHIELD JS — v4.1 (The Ghostbuster)
    //
    // Fixed: Resolves 'Click-Lock' where player interactivity is blocked.
    // Adds:
    //   1. Ghost Overlay Purger: Scans and kills invisible z-index traps.
    //   2. Native Spoofing: Bypass adblock detection by fixing toString().
    //   3. Decoy Window Factory (Enhanced)
    //   4. Selective Proxying
    // ══════════════════════════════════════════════════════════════════
    private static final String SHIELD_JS =
        "(function(){" +
        "'use strict';" +

        // Guard: Skip main Capacitor frame
        "if((window.self===window.top)&&(typeof window.Capacitor!=='undefined'||typeof window.__capacitor__!=='undefined')){return;}" +
        "if(window.__SHIELD_ARMED__)return;" +
        "window.__SHIELD_ARMED__=true;" +

        // 1. Ghostbuster: Overlay Nuker (Kills invisible interaction traps)
        "function ghostbuster(){" +
        "try{" +
        "var all=document.querySelectorAll('div,section,span');" +
        "for(var i=0;i<all.length;i++){" +
        "var n=all[i];var s=getComputedStyle(n);" +
        "var zi=parseInt(s.zIndex)||0;" +
        "var op=parseFloat(s.opacity)||1;" +
        "var vis=s.visibility;" +
        "var bg=s.backgroundColor;" +
        "if(zi>1000&&n.offsetWidth>window.innerWidth*0.9&&n.offsetHeight>window.innerHeight*0.9){" +
        "if(op<0.2||bg==='rgba(0, 0, 0, 0)'||vis==='hidden'){" +
        "console.warn('[Shield] Vaporized Ghost Overlay:',n.tagName,zi);n.remove();" +
        "}}}}catch(e){}}" +
        "setInterval(ghostbuster,800);" +

        // 2. Native Spoofing (Bypass AdBlock Detectors)
        "var nativeToString=Function.prototype.toString;" +
        "function spoof(fn,str){" +
        "try{fn.toString=function(){return str;};}catch(e){}}" +

        // 3. Decoy Window Factory
        "function createDecoyWindow(){" +
        "var d={closed:false,opener:window," +
        "location:{href:'about:blank',replace:function(){},assign:function(){}}," +
        "document:{write:function(){},close:function(){},readyState:'complete'}," +
        "focus:function(){},blur:function(){},close:function(){d.closed=true;}," +
        "postMessage:function(){},addEventListener:function(){},removeEventListener:function(){}," +
        "dispatchEvent:function(){return true;},setTimeout:function(){return 0;}," +
        "setInterval:function(){return 0;},clearTimeout:function(){},clearInterval:function(){}" +
        "};return d;}" +

        // 4. Build popup domain lookup
        "var popupSet=new Set();" +
        "try{var inj=window.__SHIELD_POPUP_DOMAINS__||[];for(var i=0;i<inj.length;i++){popupSet.add(inj[i]);}}catch(e){}" +
        "var safeDomains=['vidsrc.to','vidsrc.me','vidsrc.net','vidsrc.io','vidsrc.in','player.videasy.net','embed.su'];" +
        "var safeSet=new Set(safeDomains);" +
        "function extractHost(u){try{if(!u||u.indexOf('://')===-1)return null;return u.split('://')[1].split('/')[0].split(':')[0].toLowerCase();}catch(e){return null;}}" +
        "function isBlocked(h){if(!h)return false;if(popupSet.has(h))return true;var p=h.split('.');for(var i=1;i<p.length-1;i++){if(popupSet.has(p.slice(i).join('.')))return true;}return false;}" +

        // 5. Intelligent window.open Proxy (with Spoofing)
        "var nativeOpen=window.open;" +
        "window.open=function(url,target,features){" +
        "try{var s=String(url||'');if(!s||s==='about:blank'||s.charAt(0)==='/'){" +
        "return nativeOpen?nativeOpen.call(window,url,target,features):createDecoyWindow();}" +
        "var h=extractHost(s);if(!h||s.indexOf('localhost')!==-1||safeSet.has(h)||!isBlocked(h)){" +
        "return nativeOpen?nativeOpen.call(window,url,target,features):createDecoyWindow();}" +
        "console.warn('[Shield] Redirect Blocked:',h);return createDecoyWindow();" +
        "}catch(e){return createDecoyWindow();}};" +
        "spoof(window.open,'function open() { [native code] }');" +

        // 6. Selective Link Interception
        "document.addEventListener('click',function(e){" +
        "var el=e.target;while(el){if(el.tagName==='A'){" +
        "var h=el.getAttribute('href')||'';var t=el.getAttribute('target')||'';" +
        "if((t==='_blank'||t==='_top')&&h.indexOf('localhost')===-1&&h.indexOf('capacitor')===-1){" +
        "var lh=extractHost(h);if(!lh||!safeSet.has(lh)){e.preventDefault();e.stopImmediatePropagation();}}" +
        "break;}el=el.parentElement;}},true);" +

        // 7. MutationObserver
        "try{var mo=new MutationObserver(function(ms){ghostbuster();" +
        "for(var i=0;i<ms.length;i++){var a=ms[i].addedNodes;" +
        "for(var j=0;j<a.length;j++){var n=a[j];if(n.nodeType!==1)continue;" +
        "if(n.tagName==='META'&&(n.getAttribute('http-equiv')||'').toLowerCase()==='refresh'){n.remove();}" +
        "if(n.tagName==='IFRAME'){var w=n.offsetWidth;var ht=n.offsetHeight;if(w<=1||ht<=1)n.remove();}" +
        "}}});mo.observe(document.documentElement,{childList:true,subtree:true});}catch(e){}" +

        // 8. Subtitle Bridge
        "(function(){var sy=new Set();setInterval(function(){" +
        "var v=document.querySelector('video');var a=window.art?.option?.subtitle||window.art?.option?.subtitles;" +
        "if(!v||!a)return;var l=Array.isArray(a)?a:[a];" +
        "l.forEach(function(t){if(t.url&&!sy.has(t.url)){" +
        "var tr=document.createElement('track');tr.kind='subtitles';tr.label=t.name||t.label||'Sub';tr.src=t.url;" +
        "v.appendChild(tr);sy.add(t.url);}});},3000);})();" +

        "console.log('[Shield v4.1 Ghostbuster 👻] AdGuard-mode Active');" +
        "})();";
;

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
