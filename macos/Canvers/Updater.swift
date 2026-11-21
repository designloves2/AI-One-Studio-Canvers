import Cocoa

/// looks at the newest mac-v* GitHub release; when it is newer, offers to open the page with the .dmg (replace the app by hand)
enum Updater {
    static let repo = "designloves2/AI-One-Studio-Canvers"

    static func check() {
        guard let url = URL(string: "https://api.github.com/repos/\(repo)/releases?per_page=30") else { return }
        var req = URLRequest(url: url); req.timeoutInterval = 10
        URLSession.shared.dataTask(with: req) { data, _, _ in
            // this app has its own releases (tag mac-vX.Y.Z); the Windows app's v2.x releases are not ours
            guard let data, let list = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
                  let j = list.first(where: { (($0["tag_name"] as? String) ?? "").hasPrefix("mac-v") && ($0["draft"] as? Bool) != true }),
                  let tag = j["tag_name"] as? String else { return }
            let latest = String(tag.dropFirst("mac-v".count))
            let cur = (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? "0"
            guard isNewer(latest, than: cur) else { return }
            let assets = (j["assets"] as? [[String: Any]]) ?? []
            let dmg = assets.first { ($0["name"] as? String)?.hasSuffix(".dmg") == true }?["browser_download_url"] as? String
            let page = dmg ?? (j["html_url"] as? String) ?? "https://github.com/\(repo)/releases"
            DispatchQueue.main.async {
                let a = NSAlert()
                a.messageText = tr("새 버전 \(latest) 이(가) 있습니다", "Version \(latest) is available")
                a.informativeText = tr("받은 뒤 앱을 응용 프로그램 폴더에 덮어 넣어 주세요.", "Download it and replace the app in the Applications folder.")
                a.addButton(withTitle: tr("내려받기", "Download")); a.addButton(withTitle: tr("나중에", "Later"))
                if a.runModal() == .alertFirstButtonReturn, let u = URL(string: page) { NSWorkspace.shared.open(u) }
            }
        }.resume()
    }

    static func isNewer(_ a: String, than b: String) -> Bool {
        let x = a.split(separator: ".").map { Int($0) ?? 0 }, y = b.split(separator: ".").map { Int($0) ?? 0 }
        for i in 0..<max(x.count, y.count) {
            let p = i < x.count ? x[i] : 0, q = i < y.count ? y[i] : 0
            if p != q { return p > q }
        }
        return false
    }
}
