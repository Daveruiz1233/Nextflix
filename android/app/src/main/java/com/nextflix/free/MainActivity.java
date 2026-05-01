package com.nextflix.free;

import android.os.Bundle;
import android.os.Message;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        
        WebView webView = this.bridge.getWebView();
        if (webView != null) {
            // Enable multiple windows to intercept popups
            webView.getSettings().setSupportMultipleWindows(true);
            webView.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);

            // Extend Capacitor's BridgeWebChromeClient to maintain default functionality
            webView.setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
                @Override
                public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                    // Decoy Window Factory: Trick ad scripts into thinking they opened a popup
                    // This prevents player freezes by returning a fake WebView
                    WebView dummyWebView = new WebView(view.getContext());
                    WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                    transport.setWebView(dummyWebView);
                    resultMsg.sendToTarget();
                    
                    // Immediately destroy it so nothing actually opens
                    dummyWebView.destroy();
                    return true;
                }
            });

            // Block iframe redirects natively
            webView.setWebViewClient(new com.getcapacitor.BridgeWebViewClient(this.bridge) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                    if (!request.isForMainFrame()) {
                        String url = request.getUrl().toString().toLowerCase();
                        // Block common ad/redirect patterns
                        if (url.contains("adscore") || url.contains("rtmark") || url.contains("pop") || url.contains("tracker") || url.contains("affiliate") || url.contains("doubleclick") || url.contains("syndication")) {
                            return true; // Block the redirect
                        }
                    }
                    return super.shouldOverrideUrlLoading(view, request);
                }
            });
        }
    }
}
