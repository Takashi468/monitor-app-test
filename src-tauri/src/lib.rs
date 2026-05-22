use std::fs;
use std::io::Write;
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn download_video(app: tauri::AppHandle, url: String, filename: String) -> Result<String, String> {
    // We use the app_data_dir for storing these videos
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    
    // Ensure directory exists
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
    }
    
    let file_path = app_data_dir.join(&filename);
    
    // If file already exists, skip download
    if file_path.exists() {
        return Ok(file_path.to_string_lossy().into_owned());
    }

    // Download the video
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    
    let mut file = fs::File::create(&file_path).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;
    
    Ok(file_path.to_string_lossy().into_owned())
}

#[tauri::command]
fn get_cached_video_path(app: tauri::AppHandle, filename: String) -> Result<Option<String>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let file_path = app_data_dir.join(&filename);
    
    if file_path.exists() {
        Ok(Some(file_path.to_string_lossy().into_owned()))
    } else {
        Ok(None)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            download_video,
            get_cached_video_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
