use std::path::PathBuf;
use std::sync::OnceLock;
use dirs;

static DATA_DIR: OnceLock<PathBuf> = OnceLock::new();

pub fn get_pulse_data_dir() -> &'static PathBuf {
    DATA_DIR.get_or_init(|| {
        let path = dirs::data_local_dir()
            .map(|d| d.join("Pulse"))
            .unwrap_or_else(|| {
                dirs::home_dir()
                    .unwrap_or_else(|| PathBuf::from("."))
                    .join(".pulse")
            });
            
        if !path.exists() {
            if let Err(e) = std::fs::create_dir_all(&path) {
                eprintln!("Warning: Failed to create data directory: {}", e);
            }
        }
        path
    })
}
