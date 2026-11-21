import Cocoa
import WebKit

/// the web view: remote Canvers page, bundled setup page, one window only, downloads to ~/Downloads
final class WebController: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, WKDownloadDelegate {
    let view: WKWebView
    private var downloadTargets: [ObjectIdentifier: URL] = [:]
    private let key = "address"

    override init() {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()   // persistent: keeps the Cloudflare sign-in
        view = WKWebView(frame: .zero, configuration: cfg)
        super.init()
        cfg.userContentController.add(self, name: "canvers")
        let js = WKUserScript(source: Self.switchJS(), injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        cfg.userContentController.addUserScript(js)
        view.navigationDelegate = self
        view.uiDelegate = self
        view.allowsBackForwardNavigationGestures = true
    }

    static func switchJS() -> String {
        let title = tr("연결 바꾸기", "Switch connection")
        return """
        (function(){try{if(location.protocol==='file:'||document.getElementById('canvers-switch')||!document.body)return;
        var a=document.createElement('a');a.id='canvers-switch';a.href='#';a.textContent='\\u21C4';a.title='\(title)';
        a.style.cssText='position:fixed;left:8px;bottom:8px;z-index:2147483647;width:22px;height:22px;line-height:22px;text-align:center;border-radius:11px;background:#1b1e26;color:#cfd3dc;border:1px solid #2a2e38;font:13px system-ui;text-decoration:none;opacity:.35;cursor:pointer';
        a.onmouseenter=function(){a.style.opacity='1'};a.onmouseleave=function(){a.style.opacity='.35'};
        a.onclick=function(e){e.preventDefault();window.webkit.messageHandlers.canvers.postMessage({type:'switch'})};
        document.body.appendChild(a);}catch(e){}})();
        """
    }

    var saved: String? { UserDefaults.standard.string(forKey: key) }

    func start() {
        if let a = saved, let u = URL(string: a + "/") { view.load(URLRequest(url: u)) } else { showConnect() }
    }

    func showConnect() {
        guard let f = Bundle.main.url(forResource: "connect", withExtension: "html") else { return }
        view.loadFileURL(f, allowingReadAccessTo: f.deletingLastPathComponent())
    }

    // MARK: setup page messages
    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) {
        guard let d = m.body as? [String: Any], let type = d["type"] as? String else { return }
        switch type {
        case "switch": showConnect()
        case "load": reply("window.canvers.saved(\(jsString(saved ?? "")))")
        case "connect":
            let addr = d["address"] as? String ?? ""
            Task { await self.connect(addr) }
        default: break
        }
    }
    private func jsString(_ s: String) -> String {
        (try? String(data: JSONEncoder().encode(s), encoding: .utf8)) ?? "\"\""
    }
    private func reply(_ js: String) { DispatchQueue.main.async { self.view.evaluateJavaScript(js) } }

    /// same rules as server-lib/connection.mjs `normalize`
    static func normalize(_ address: String) -> String? {
        var a = address.trimmingCharacters(in: .whitespacesAndNewlines)
        while a.hasSuffix("/") { a.removeLast() }
        if a.isEmpty { return nil }
        if !a.lowercased().hasPrefix("http://") && !a.lowercased().hasPrefix("https://") {
            let l = a.lowercased()
            let host = l.split(separator: "/").first.map(String.init) ?? l
            var priv = l.hasPrefix("localhost") || l.hasPrefix("127.") || l.hasPrefix("10.") || l.hasPrefix("192.168.") || l.hasPrefix("[::1]")
                || (host.split(separator: ":").first.map { $0.hasSuffix(".local") } ?? false)
            if l.hasPrefix("172."), l.split(separator: ".").count > 1, let n = Int(l.split(separator: ".")[1]), (16...31).contains(n) { priv = true }
            a = (priv ? "http://" : "https://") + a
        }
        guard let u = URL(string: a), let s = u.scheme, let h = u.host else { return nil }
        return "\(s)://\(h)" + (u.port.map { ":\($0)" } ?? "")
    }

    private final class NoRedirect: NSObject, URLSessionTaskDelegate {
        func urlSession(_ s: URLSession, task: URLSessionTask, willPerformHTTPRedirection r: HTTPURLResponse, newRequest: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
    }

    /// 1) a Canvers server -> open it  2) answers with a sign-in wall -> open it so the user can sign in  3) otherwise an error
    func connect(_ address: String) async {
        guard let base = Self.normalize(address), let url = URL(string: base + "/canvers/target") else {
            reply("window.canvers.result(false,\(jsString(tr("주소를 입력해 주세요", "Enter an address"))))"); return
        }
        var req = URLRequest(url: url); req.timeoutInterval = 8
        let session = URLSession(configuration: .ephemeral, delegate: NoRedirect(), delegateQueue: nil)
        var ok = false; var msg = ""
        do {
            let (data, resp) = try await session.data(for: req)
            let r = resp as! HTTPURLResponse
            let loc = (r.value(forHTTPHeaderField: "Location") ?? "").lowercased()
            if r.statusCode == 200, let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any], j["url"] is String {
                ok = true; msg = tr("Canvers 서버입니다 · 연결합니다…", "This is a Canvers server · connecting…")
            } else if r.statusCode == 401 || r.statusCode == 403 || ["cloudflareaccess", "/cdn-cgi/access", "login", "signin"].contains(where: loc.contains) {
                ok = true; msg = tr("로그인이 필요한 주소입니다 · 창에서 로그인합니다…", "This address needs a sign-in · sign in in the window…")
            } else {
                msg = tr("Canvers 서버가 아닙니다 (응답 \(r.statusCode)). Canvers 서버 주소를 넣어 주세요", "Not a Canvers server (response \(r.statusCode)). Enter the Canvers server address")
            }
        } catch {
            msg = tr("주소를 읽을 수 없습니다 (\(error.localizedDescription))", "Cannot read this address (\(error.localizedDescription))")
        }
        await MainActor.run {
            self.reply("window.canvers.result(\(ok),\(self.jsString(msg)))")
            if ok { UserDefaults.standard.set(base, forKey: self.key); if let u = URL(string: base + "/") { self.view.load(URLRequest(url: u)) } }
        }
    }

    // MARK: one window: a link that wants a new window opens here
    func webView(_ w: WKWebView, createWebViewWith c: WKWebViewConfiguration, for a: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if a.request.url != nil { w.load(a.request) }
        return nil
    }

    // JS alert/confirm/prompt
    func webView(_ w: WKWebView, runJavaScriptAlertPanelWithMessage m: String, initiatedByFrame f: WKFrameInfo, completionHandler ch: @escaping () -> Void) {
        let a = NSAlert(); a.messageText = m; a.runModal(); ch()
    }
    func webView(_ w: WKWebView, runJavaScriptConfirmPanelWithMessage m: String, initiatedByFrame f: WKFrameInfo, completionHandler ch: @escaping (Bool) -> Void) {
        let a = NSAlert(); a.messageText = m; a.addButton(withTitle: "OK"); a.addButton(withTitle: tr("취소", "Cancel")); ch(a.runModal() == .alertFirstButtonReturn)
    }
    func webView(_ w: WKWebView, runOpenPanelWith p: WKOpenPanelParameters, initiatedByFrame f: WKFrameInfo, completionHandler ch: @escaping ([URL]?) -> Void) {
        let o = NSOpenPanel(); o.allowsMultipleSelection = p.allowsMultipleSelection; o.canChooseDirectories = p.allowsDirectories
        ch(o.runModal() == .OK ? o.urls : nil)
    }

    // MARK: downloads -> ~/Downloads
    func webView(_ w: WKWebView, decidePolicyFor a: WKNavigationAction, preferences: WKWebpagePreferences, decisionHandler: @escaping (WKNavigationActionPolicy, WKWebpagePreferences) -> Void) {
        decisionHandler(a.shouldPerformDownload ? .download : .allow, preferences)
    }
    func webView(_ w: WKWebView, decidePolicyFor r: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        let disp = ((r.response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Content-Disposition") ?? "").lowercased()
        decisionHandler(disp.hasPrefix("attachment") || !r.canShowMIMEType ? .download : .allow)
    }
    func webView(_ w: WKWebView, navigationAction: WKNavigationAction, didBecome d: WKDownload) { d.delegate = self }
    func webView(_ w: WKWebView, navigationResponse: WKNavigationResponse, didBecome d: WKDownload) { d.delegate = self }

    func download(_ d: WKDownload, decideDestinationUsing r: URLResponse, suggestedFilename: String, completionHandler ch: @escaping (URL?) -> Void) {
        let dir = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask)[0]
        var dest = dir.appendingPathComponent(suggestedFilename)
        let base = dest.deletingPathExtension().lastPathComponent, ext = dest.pathExtension
        var i = 1
        while FileManager.default.fileExists(atPath: dest.path) { dest = dir.appendingPathComponent("\(base) \(i)" + (ext.isEmpty ? "" : ".\(ext)")); i += 1 }
        downloadTargets[ObjectIdentifier(d)] = dest
        ch(dest)
    }
    func downloadDidFinish(_ d: WKDownload) {
        if let u = downloadTargets.removeValue(forKey: ObjectIdentifier(d)) { NSWorkspace.shared.activateFileViewerSelecting([u]) }
    }
    func download(_ d: WKDownload, didFailWithError e: Error, resumeData: Data?) { downloadTargets.removeValue(forKey: ObjectIdentifier(d)) }

    func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) {
        if (e as NSError).code == NSURLErrorCancelled { return }
        let a = NSAlert(); a.messageText = tr("페이지를 열 수 없습니다", "Cannot open the page"); a.informativeText = e.localizedDescription
        a.addButton(withTitle: tr("연결 설정", "Connection settings")); a.addButton(withTitle: tr("닫기", "Close"))
        if a.runModal() == .alertFirstButtonReturn { showConnect() }
    }
}
