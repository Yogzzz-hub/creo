import Capacitor
import UIKit

/// The app's bridge view controller: registers the plugins that live in this project.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SystemChromePlugin())
    }
}

/// Colors the areas behind the status bar and home indicator to match the web app's
/// theme (src/app/NativeShell.tsx). With contentInset "always" the page sits clear of
/// them, so those areas show the web view's own background.
@objc(SystemChromePlugin)
public class SystemChromePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SystemChromePlugin"
    public let jsName = "SystemChrome"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setBackgroundColor", returnType: CAPPluginReturnPromise)
    ]

    @objc func setBackgroundColor(_ call: CAPPluginCall) {
        guard let color = UIColor.capacitor.color(fromHex: call.getString("color") ?? "") else {
            call.reject("Expected a color such as #0f0e0c")
            return
        }
        DispatchQueue.main.async {
            if let webView = self.bridge?.webView {
                webView.backgroundColor = color
                webView.scrollView.backgroundColor = color
                webView.underPageBackgroundColor = color
            }
            self.bridge?.viewController?.view.backgroundColor = color
            call.resolve()
        }
    }
}
