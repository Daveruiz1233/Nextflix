package com.nextflix.free;

import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private List<String> adDomains = new ArrayList<>();

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        loadAdRules();
        
        // Inject the Native Shield into the WebView
        this.bridge.getWebView().setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString().toLowerCase();
                
                // Check if the URL matches any of our known ad domains
                for (String domain : adDomains) {
                    if (domain.length() > 3 && url.contains(domain)) {
                        // Return empty response to kill the ad request silently
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
                adDomains.add(domain.replace("\\", "")); // Cleanup regex slash
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
