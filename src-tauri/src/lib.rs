// AI ONE Studio Canvers - desktop shell.
// Starts the bundled Canvers server (Node, the same serve.mjs as start.bat), opens it in a window,
// keeps the user's data in the app data folder and checks GitHub releases for updates.
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;

use tauri::menu::{MenuBuilder, SubmenuBuilder};
use tauri::webview::NewWindowResponse;
use tauri::{Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_updater::UpdaterExt;

/// Korean texts when the app's language is Korean (lang.txt, written by the app) or, before that, the Windows language is Korean; otherwise English
fn ko(app: &tauri::AppHandle) -> bool {
    if let Ok(dir) = app.path().app_data_dir() {
        if let Ok(t) = std::fs::read_to_string(dir.join("lang.txt")) {
            return t.trim() == "ko";
        }
    }
    sys_locale::get_locale().map(|l| l.to_lowercase().starts_with("ko")).unwrap_or(false)
}
fn tr(app: &tauri::AppHandle, k: &'static str, e: &'static str) -> &'static str {
    if ko(app) { k } else { e }
}

/// fixed on purpose: the page's saved settings (localStorage) belong to this address
const PORT: u16 = 8775;

struct Server(Mutex<Option<Child>>);

fn listening() -> bool {
    TcpStream::connect_timeout(&([127, 0, 0, 1], PORT).into(), Duration::from_millis(300)).is_ok()
}

/// strip the \\?\ prefix Windows puts on resource paths (Node does not like it in a script path)
fn plain(p: PathBuf) -> PathBuf {
    let s = p.to_string_lossy().to_string();
    PathBuf::from(s.strip_prefix(r"\\?\").unwrap_or(&s).to_string())
}

fn start_server(app: &tauri::AppHandle) -> Result<Option<Child>, String> {
    if listening() {
        return Ok(None); // a Canvers server of this app is already there
    }
    let res = plain(app.path().resource_dir().map_err(|e| e.to_string())?);
    let data = plain(app.path().app_data_dir().map_err(|e| e.to_string())?);
    for d in ["canvases", "director", "projects"] {
        std::fs::create_dir_all(data.join(d)).map_err(|e| e.to_string())?;
    }
    let mut cmd = Command::new(res.join("node.exe"));
    cmd.arg(res.join("serve.mjs"))
        .current_dir(&res)
        .env("PORT", PORT.to_string())
        .env("CANVERS_DIR", data.join("canvases"))
        .env("CANVERS_DIRECTOR_DIR", data.join("director"))
        .env("CANVERS_PROJECTS_DIR", data.join("projects"))
        .env("CANVERS_APP", "1")
        .env("CANVERS_CONFIG", data.join("connection.json"));
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // no console window
    }
    cmd.spawn().map(Some).map_err(|e| format!("could not start the Canvers server: {e}"))
}

/// stop the server we started (it runs from the install folder, which an update must be able to replace)
fn stop_server(app: &tauri::AppHandle) {
    if let Some(s) = app.try_state::<Server>() {
        if let Some(mut c) = s.0.lock().unwrap().take() {
            let _ = c.kill();
            let _ = c.wait();
        }
    }
}

/// where the window opens: a remote Canvers server when the user chose one (connection.json), else the built-in server
fn start_url(app: &tauri::AppHandle) -> String {
    let local = format!("http://127.0.0.1:{PORT}/");
    let Ok(dir) = app.path().app_data_dir() else { return local };
    let Ok(text) = std::fs::read_to_string(dir.join("connection.json")) else { return local };
    let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) else { return local };
    match (v["mode"].as_str(), v["address"].as_str()) {
        (Some("remote"), Some(a)) if a.starts_with("http") => format!("{}/", a.trim_end_matches('/')),
        _ => local,
    }
}

async fn check_update(app: tauri::AppHandle) {
    let Ok(updater) = app.updater() else { return };
    let Ok(Some(update)) = updater.check().await else { return };
    let ask = app.clone();
    let version = update.version.clone();
    let yes = tauri::async_runtime::spawn_blocking(move || {
        ask.dialog()
            .message(if ko(&ask) { format!("새 버전 {version} 이(가) 있습니다. 지금 설치할까요?\n(설치 후 앱이 다시 시작됩니다)") } else { format!("Version {version} is available. Install it now?\n(The app restarts after installing.)") })
            .title(tr(&ask, "AI ONE Studio Canvers 업데이트", "AI ONE Studio Canvers update"))
            .buttons(MessageDialogButtons::OkCancelCustom(tr(&ask, "지금 설치", "Install now").into(), tr(&ask, "나중에", "Later").into()))
            .blocking_show()
    })
    .await
    .unwrap_or(false);
    if yes {
        stop_server(&app);
        if update.download_and_install(|_, _| {}, || {}).await.is_ok() {
            app.restart();
        }
    }
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // one window only: a link that wants a new window (target=_blank, window.open, a sign-in popup) opens in this window instead
            let again = app.handle().clone();
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("AI ONE Studio Canvers")
                .inner_size(1440.0, 900.0)
                .min_inner_size(900.0, 600.0)
                .disable_drag_drop_handler()
                .on_new_window(move |url, _| {
                    if let Some(w) = again.get_webview_window("main") {
                        let target = serde_json::to_string(url.as_str()).unwrap_or_default();
                        let _ = w.eval(&format!("window.location.href = {target}"));
                    }
                    NewWindowResponse::Deny
                })
                .build()?;
            let menu = MenuBuilder::new(app)
                .item(
                    &SubmenuBuilder::new(app, tr(app.handle(), "연결", "Connection"))
                        .text("connect", tr(app.handle(), "연결 설정…", "Connection settings…"))
                        .separator()
                        .quit()
                        .build()?,
                )
                .build()?;
            app.set_menu(menu)?;
            app.on_menu_event(|app, event| {
                if event.id() == "connect" {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.eval(&format!("window.location.replace('http://127.0.0.1:{PORT}/canvers/connect')"));
                    }
                }
            });
            let handle = app.handle().clone();
            match start_server(&handle) {
                Ok(child) => {
                    app.manage(Server(Mutex::new(child)));
                }
                Err(e) => {
                    app.manage(Server(Mutex::new(None)));
                    handle.dialog().message(e).title("AI ONE Studio Canvers").blocking_show();
                }
            }
            // open the page as soon as the server answers, then look for an update
            tauri::async_runtime::spawn(async move {
                for _ in 0..120 {
                    if listening() {
                        break;
                    }
                    tokio_sleep().await;
                }
                if let Some(w) = handle.get_webview_window("main") {
                    let url = start_url(&handle);
                    let _ = w.eval(&format!("window.location.replace('{url}')"));
                }
                check_update(handle).await;
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building the Canvers app");

    app.run(|handle, event| {
        if let RunEvent::Exit = event {
            stop_server(handle);
        }
    });
}

async fn tokio_sleep() {
    let _ = tauri::async_runtime::spawn_blocking(|| std::thread::sleep(Duration::from_millis(250))).await;
}
