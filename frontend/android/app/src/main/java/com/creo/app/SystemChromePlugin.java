package com.creo.app;

import android.graphics.Color;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Colors the strips behind the status and navigation bars to match the web app's
 * theme (src/app/NativeShell.tsx). Capacitor pads the window clear of the system
 * bars, so those strips show the window's background; Android 15+ no longer lets
 * apps color the bars themselves.
 */
@CapacitorPlugin(name = "SystemChrome")
public class SystemChromePlugin extends Plugin {

    @PluginMethod
    public void setBackgroundColor(PluginCall call) {
        int color;
        try {
            color = Color.parseColor(call.getString("color", ""));
        } catch (RuntimeException e) {
            // parseColor throws IllegalArgumentException, or StringIndexOutOfBoundsException for "".
            call.reject("Expected a color such as #0f0e0c");
            return;
        }
        getBridge().executeOnMainThread(() -> {
            getActivity().getWindow().getDecorView().setBackgroundColor(color);
            getBridge().getWebView().setBackgroundColor(color);
            call.resolve();
        });
    }
}
