package com.creo.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // App plugins must be registered before the bridge starts.
        registerPlugin(SystemChromePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
