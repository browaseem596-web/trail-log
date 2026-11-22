package com.trailog.app;

import android.os.Bundle;
import android.view.View;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // A number of Android WebView / GPU combinations drop image layers that sit
        // inside composited elements, which makes Leaflet tiles render as a blank
        // rectangle. Rendering the WebView in software avoids that compositing path.
        View webView = getBridge().getWebView();
        if (webView != null) {
            webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        }
    }
}
