// AI ONE Studio Canvers - macOS shell. A single window around the remote Canvers server (no server runs on the Mac).
import Cocoa
import WebKit

let isKorean: Bool = (Locale.preferredLanguages.first ?? "en").hasPrefix("ko")
func tr(_ ko: String, _ en: String) -> String { isKorean ? ko : en }

final class AppDelegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!
    var web: WebController!

    func applicationDidFinishLaunching(_ n: Notification) {
        web = WebController()
        let screen = NSScreen.main?.visibleFrame.size ?? CGSize(width: 1440, height: 900)
        let size = NSSize(width: min(1440, screen.width * 0.9), height: min(900, screen.height * 0.9))
        window = NSWindow(contentRect: NSRect(origin: .zero, size: size),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        window.title = "AI ONE Studio Canvers"
        window.minSize = NSSize(width: min(900, size.width), height: min(600, size.height))
        window.contentView = web.view
        window.setFrameAutosaveName("main")
        window.center()
        window.makeKeyAndOrderFront(nil)
        buildMenu()
        web.start()
        NSApp.activate(ignoringOtherApps: true)
        Updater.check()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    @objc func showConnect() { web.showConnect() }
    @objc func reload() { web.view.reload() }

    func buildMenu() {
        let main = NSMenu()
        func add(_ menu: NSMenu) { let i = NSMenuItem(); i.submenu = menu; main.addItem(i) }
        let name = "AI ONE Studio Canvers"

        let appMenu = NSMenu()
        appMenu.addItem(withTitle: tr("\(name) 정보", "About \(name)"), action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        let c = NSMenuItem(title: tr("연결 설정…", "Connection settings…"), action: #selector(showConnect), keyEquivalent: "k")
        c.keyEquivalentModifierMask = [.command, .shift]; c.target = self
        appMenu.addItem(c)
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: tr("\(name) 가리기", "Hide \(name)"), action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        let ho = NSMenuItem(title: tr("다른 앱 가리기", "Hide Others"), action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        ho.keyEquivalentModifierMask = [.command, .option]; appMenu.addItem(ho)
        appMenu.addItem(withTitle: tr("모두 보기", "Show All"), action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: tr("\(name) 종료", "Quit \(name)"), action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        add(appMenu)

        let edit = NSMenu(title: tr("편집", "Edit"))
        edit.addItem(withTitle: tr("실행 취소", "Undo"), action: Selector(("undo:")), keyEquivalent: "z")
        let redo = NSMenuItem(title: tr("다시 실행", "Redo"), action: Selector(("redo:")), keyEquivalent: "z")
        redo.keyEquivalentModifierMask = [.command, .shift]; edit.addItem(redo)
        edit.addItem(.separator())
        edit.addItem(withTitle: tr("잘라내기", "Cut"), action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        edit.addItem(withTitle: tr("복사", "Copy"), action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        edit.addItem(withTitle: tr("붙여넣기", "Paste"), action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        edit.addItem(withTitle: tr("모두 선택", "Select All"), action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        add(edit)

        let view = NSMenu(title: tr("보기", "View"))
        let r = NSMenuItem(title: tr("새로 고침", "Reload"), action: #selector(reload), keyEquivalent: "r"); r.target = self
        view.addItem(r)
        let fs = NSMenuItem(title: tr("전체 화면", "Enter Full Screen"), action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
        fs.keyEquivalentModifierMask = [.command, .control]; view.addItem(fs)
        add(view)

        let win = NSMenu(title: tr("창", "Window"))
        win.addItem(withTitle: tr("최소화", "Minimize"), action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        win.addItem(withTitle: tr("확대/축소", "Zoom"), action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
        add(win)
        NSApp.mainMenu = main
        NSApp.windowsMenu = win
    }
}
