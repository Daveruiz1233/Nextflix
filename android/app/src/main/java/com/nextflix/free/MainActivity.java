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

    private static final String SHIELD_JS =
        "(function(){" +
        "'use strict';" +
        // 1. ABSOLUTE ISOLATION
        "var loc = window.location.href || '';" +
        "if(loc.indexOf('localhost') !== -1 || loc.indexOf('capacitor://') !== -1){" +
        "window.open=function(){return{closed:true,focus:function(){},close:function(){}};};" +
        "return;" +
        "}" +

        "var _ok=['localhost','127.0.0.1','capacitor'];" +
        "function isOk(u){" +
        "if(!u||u===''||u==='#')return true;" +
        "var s=String(u);if(s.indexOf('blob:')===0||s.indexOf('data:')===0||s.indexOf('about:')===0||s.indexOf('javascript:')===0)return true;" +
        "for(var i=0;i<_ok.length;i++){if(s.indexOf(_ok[i])!==-1)return true;}" +
        "return false;" +
        "}" +

        // Prototypes
        "try{var hd=Object.getOwnPropertyDescriptor(Location.prototype,'href');" +
        "if(hd&&hd.set){var os=hd.set;Object.defineProperty(Location.prototype,'href',{get:hd.get,set:function(u){if(isOk(String(u))){os.call(this,u);}},configurable:true});}}" +
        "catch(e){}" +

        "try{var or=Location.prototype.replace;Location.prototype.replace=function(u){if(isOk(String(u))){or.call(this,u);}};}catch(e){}" +

        "window.open=function(){return{closed:true,focus:function(){},close:function(){},postMessage:function(){}};};" +

        "document.addEventListener('click',function(e){" +
        "var el=e.target;while(el){if(el.tagName==='A'){" +
        "var h=el.getAttribute('href')||'';var t=el.getAttribute('target')||'';" +
        "if((t==='_blank'||t==='_top'||t==='_parent')&&!isOk(h)){e.preventDefault();e.stopImmediatePropagation();return false;}break;}" +
        "el=el.parentElement;}},true);" +

        // Kill meta-refresh and clickjacking
        "try{var mo=new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var adds=ms[i].addedNodes;" +
        "for(var j=0;j<adds.length;j++){var n=adds[j];if(!n.tagName)continue;var t=n.tagName.toUpperCase();" +
        "if(t==='META'&&(n.getAttribute('http-equiv')||'').toLowerCase()==='refresh'){n.remove();}" +
        "if((t==='DIV'||t==='A'||t==='SPAN')&&n.style){" +
        "var z=parseInt(n.style.zIndex||'0');var o=parseFloat(n.style.opacity||'1');" +
        "if(z>999&&o<0.1){n.remove();}}}}});mo.observe(document.documentElement,{childList:true,subtree:true});}catch(e){}" +

        "console.log('[Shield v3] Isolated iframe protection armed');" +
        "})();";

    private static final WebResourceResponse EMPTY_OK =
        new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream("".getBytes()));

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = this.bridge.getWebView();
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                return false;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (request.isForMainFrame() && !url.contains("localhost") && !url.startsWith("capacitor://")) {
                    return true;
                }
                return false;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString().toLowerCase();
                if (url.contains("/popup") || url.contains("pop.js") || url.contains("/ads/") || url.contains("/redirect")) {
                    return EMPTY_OK;
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript(SHIELD_JS, null);
            }
        });
    }
}
