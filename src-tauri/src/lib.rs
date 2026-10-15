mod reminders;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};
use tauri_plugin_sql::{Migration, MigrationKind};

const DB_URL: &str = "sqlite:tracker.db";

fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create initial tables",
        sql: r#"
            CREATE TABLE areas (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                sort INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE goals (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                notes TEXT NOT NULL DEFAULT '',
                level TEXT NOT NULL,
                period TEXT NOT NULL,
                parent_id TEXT,
                area_id TEXT,
                archived INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            CREATE TABLE tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                notes TEXT NOT NULL DEFAULT '',
                goal_id TEXT,
                area_id TEXT,
                date TEXT,
                time TEXT,
                remind_before INTEGER,
                priority INTEGER NOT NULL DEFAULT 4,
                done INTEGER NOT NULL DEFAULT 0,
                done_at TEXT,
                recurrence TEXT,
                subtasks TEXT NOT NULL DEFAULT '[]',
                sort INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            CREATE INDEX tasks_date ON tasks(date);
            CREATE INDEX tasks_goal ON tasks(goal_id);
            CREATE TABLE settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        "#,
        kind: MigrationKind::Up,
    }]
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        // A second launch focuses the running app instead of opening a copy.
        builder = builder
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                show_main_window(app);
            }))
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec!["--minimized"]),
            ));
    }

    builder
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_URL, migrations())
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(reminders::ReminderState::default())
        .invoke_handler(tauri::generate_handler![
            reminders::sync_reminders,
            write_text_file,
            read_text_file
        ])
        .setup(|app| {
            let open = MenuItem::with_id(app, "open", "Open MyTodoTracker", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &quit])?;

            TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("MyTodoTracker")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            // Started by autostart: stay in the tray until the user opens the window.
            let minimized = std::env::args().any(|a| a == "--minimized");
            if !minimized {
                show_main_window(app.handle());
            }

            reminders::start(app.handle().clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the window keeps the app in the tray so reminders still fire.
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running MyTodoTracker");
}
