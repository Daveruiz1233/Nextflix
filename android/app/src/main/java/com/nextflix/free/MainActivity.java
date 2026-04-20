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
    private static final String SHIELD_JS =
        "(function(){" +
        "'use strict';" +

        // Skip main Capacitor frame
        "var isCapMain=(window.self===window.top)&&(typeof window.Capacitor!=='undefined'||typeof window.__capacitor__!=='undefined');" +
        "if(isCapMain){window.open=function(){return{closed:true,focus:function(){},close:function(){}};};return;}" +

        "var _ok=['localhost','127.0.0.1','capacitor'];" +
        "function isOk(u){" +
        "if(!u||u===''||u==='#')return true;" +
        "var s=String(u);" +
        "if(s.indexOf('blob:')===0||s.indexOf('data:')===0||s.indexOf('about:')===0||s.indexOf('javascript:')===0)return true;" +
        "for(var i=0;i<_ok.length;i++){if(s.indexOf(_ok[i])!==-1)return true;}" +
        "return false;" +
        "}" +

        // 1. location.href
        "try{var hd=Object.getOwnPropertyDescriptor(Location.prototype,'href');" +
        "if(hd&&hd.set){var os=hd.set;" +
        "Object.defineProperty(Location.prototype,'href',{get:hd.get," +
        "set:function(u){if(isOk(String(u))){os.call(this,u);}},configurable:true});}}" +
        "catch(e){}" +

        // 2. location.replace
        "try{var or=Location.prototype.replace;" +
        "Location.prototype.replace=function(u){if(isOk(String(u))){or.call(this,u);}};}catch(e){}" +

        // 3. location.assign
        "try{var oa=Location.prototype.assign;" +
        "Location.prototype.assign=function(u){if(isOk(String(u))){oa.call(this,u);}};}catch(e){}" +

        // 4. window.open — TOTAL KILL
        "window.open=function(){return{closed:true,focus:function(){},close:function(){},postMessage:function(){}};};" +

        // 5. <a> click with target=_blank/_top/_parent
        "document.addEventListener('click',function(e){" +
        "var el=e.target;while(el){" +
        "if(el.tagName==='A'){" +
        "var h=el.getAttribute('href')||'';var t=el.getAttribute('target')||'';" +
        "if((t==='_blank'||t==='_top'||t==='_parent')&&!isOk(h)){" +
        "e.preventDefault();e.stopImmediatePropagation();return false;}break;}" +
        "el=el.parentElement;}},true);" +

        // 6. HTMLAnchorElement.prototype.click
        "try{var ac=HTMLAnchorElement.prototype.click;" +
        "HTMLAnchorElement.prototype.click=function(){if(!isOk(this.href||''))return;ac.call(this);};}catch(e){}" +

        // 7. setTimeout/setInterval eval-string
        "try{var oST=window.setTimeout;window.setTimeout=function(fn,d){" +
        "if(typeof fn==='string'&&(fn.indexOf('location')!==-1||fn.indexOf('open(')!==-1||fn.indexOf('href')!==-1))return 0;" +
        "return oST.apply(this,arguments);};" +
        "var oSI=window.setInterval;window.setInterval=function(fn,d){" +
        "if(typeof fn==='string'&&(fn.indexOf('location')!==-1||fn.indexOf('open(')!==-1))return 0;" +
        "return oSI.apply(this,arguments);};}catch(e){}" +

        // 8. requestAnimationFrame
        "try{var oRAF=window.requestAnimationFrame;" +
        "window.requestAnimationFrame=function(fn){if(typeof fn==='string')return 0;return oRAF.apply(this,arguments);};}catch(e){}" +

        // 9. document.write injection
        "try{var oDW=document.write;document.write=function(h){" +
        "var s=String(h||'').toLowerCase();" +
        "if(s.indexOf('location')!==-1||s.indexOf('window.open')!==-1||s.indexOf('meta http-equiv')!==-1)return;" +
        "oDW.call(document,h);};}catch(e){}" +

        // 10. postMessage redirect blocker
        "window.addEventListener('message',function(e){" +
        "if(e.data&&typeof e.data==='string'){var d=e.data.toLowerCase();" +
        "if(d.indexOf('redirect')!==-1||d.indexOf('navigate')!==-1||d.indexOf('location')!==-1){e.stopImmediatePropagation();return;}}" +
        "},true);" +

        // 11. MutationObserver — kill meta-refresh, clickjack overlays, ad iframes
        "try{var mo=new MutationObserver(function(ms){" +
        "for(var i=0;i<ms.length;i++){var a=ms[i].addedNodes;" +
        "for(var j=0;j<a.length;j++){var n=a[j];if(!n.tagName)continue;var t=n.tagName.toUpperCase();" +
        // Kill meta-refresh
        "if(t==='META'&&(n.getAttribute('http-equiv')||'').toLowerCase()==='refresh'){n.remove();continue;}" +
        // Kill invisible clickjack overlays
        "if((t==='DIV'||t==='A'||t==='SPAN')&&n.style){" +
        "var p=n.style.position;var z=parseInt(n.style.zIndex||'0');var o=parseFloat(n.style.opacity||'1');" +
        "if((p==='fixed'||p==='absolute')&&z>999&&o<0.05){n.remove();continue;}}" +
        // Kill zero-size tracking iframes
        "if(t==='IFRAME'){var w=parseInt(n.style.width||n.getAttribute('width')||'999');" +
        "var ht=parseInt(n.style.height||n.getAttribute('height')||'999');" +
        "if(w<=1||ht<=1){n.remove();continue;}" +
        "var src=(n.getAttribute('src')||'').toLowerCase();" +
        "if(src.indexOf('ad')!==-1||src.indexOf('pop')!==-1||src.indexOf('click')!==-1||src.indexOf('track')!==-1){n.remove();}}" +
        "}}});mo.observe(document.documentElement||document,{childList:true,subtree:true});}catch(e){}" +

        // 12. beforeunload kill
        "window.addEventListener('beforeunload',function(e){e.preventDefault();e.returnValue='';},true);" +

        "console.log('[Shield v2] 12 vectors + MutationObserver active');" +
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

                // Fast-path: known ad domains
                if (host != null) {
                    for (String ad : AD_DOMAINS) {
                        if (host.equals(ad) || host.endsWith("." + ad)) {
                            return isScript(url) ? EMPTY_JS : EMPTY_OK;
                        }
                    }
                }

                // URL pattern blocking
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
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript(SHIELD_JS, null);
            }
        });

        Log.i(TAG, "🛡️ Shield v2 — 12 vectors + MutationObserver + native blocks");
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
