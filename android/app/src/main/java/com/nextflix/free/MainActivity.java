package com.nextflix.free;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class MainActivity extends BridgeActivity {
    private Set<String> adDomains = new HashSet<>();
    private static final String TAG = "NextflixShield";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        loadAdRules();
        
        // Inject the Native Shield into the WebView
        this.bridge.getWebView().setWebViewClient(new WebViewClient() {
            
            // 🛑 Redirect Firewall: Kills all ad-initiated top-level redirects
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                boolean isForMainFrame = request.isForMainFrame();
                
                // Allow our own app origin and Capacitor internal schemes
                if (url.startsWith("http://localhost") || url.startsWith("https://localhost") || url.startsWith("capacitor://")) {
                    return false;
                }

                // If an iframe tries to navigate the TOP frame to an external domain, BLOCK IT.
                if (isForMainFrame) {
                    Log.e(TAG, "🚫 HIJACK ATTEMPT BLOCKED: " + url);
                    return true; // Hard block
                }

                return false; 
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString().toLowerCase();
                
                // 🕵️ Stealth Mode: Fake 200 OK for aggressive trackers from your logs
                if (url.contains("rtmark.net") || 
                    url.contains("104processors.net") || 
                    url.contains("yandex.ru") || 
                    url.contains("vidlink.pro/api/")) {
                    Log.d(TAG, "👻 STEALTH BLOCK (FAKE OK): " + url);
                    return new WebResourceResponse("application/javascript", "UTF-8", 
                        new ByteArrayInputStream("console.log('Shielded');".getBytes()));
                }

                // Standard domain blocklist
                for (String domain : adDomains) {
                    if (domain.length() > 3 && url.contains(domain)) {
                        Log.d(TAG, "🛡️ DOMAIN BLOCKED: " + url);
                        return new WebResourceResponse("text/plain", "UTF-8", null);
                    }
                }
                
                return super.shouldInterceptRequest(view, request);
            }
        });
    }

    private void loadAdRules() {
        try {
            InputStream is = getAssets().open("adblock-rules.json");
            int size = is.available();
            byte[] buffer = new byte[size];
            is.read(buffer);
            is.close();
            String json = new String(buffer, "UTF-8");
            JSONArray array = new JSONArray(json);
            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                String domain = obj.getJSONObject("trigger").getString("url-filter");
                // Cleanup common filter patterns
                String cleanDomain = domain.replace("\\", "").replace("^", "").replace("*", "");
                adDomains.add(cleanDomain);
            }
            Log.i(TAG, "✅ Loaded " + adDomains.size() + " native ad-blocking rules");
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to load adblock rules", e);
        }
    }
}
