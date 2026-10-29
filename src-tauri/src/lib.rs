mod bitaxe;

use serde_json::{json, Value};

/// What this build of the desktop shell can do. The frontend keeps CPU mining simulated
/// until a native mining engine is added here and `miner` is set to true.
#[tauri::command]
fn backend_info() -> Value {
    json!({ "miner": false, "version": env!("CARGO_PKG_VERSION") })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![backend_info, bitaxe::bitaxe_request, bitaxe::bitaxe_scan])
        .run(tauri::generate_context!())
        .expect("error while running Saturn Miner");
}
