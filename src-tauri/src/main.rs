#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Load environment variables from .env file
    dotenv::dotenv().ok();

    // Initialize logger
    env_logger::init();
    log::info!("Starting Pulse application");

    pulse_lib::run()
}
