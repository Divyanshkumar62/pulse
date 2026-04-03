#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Initialize logger
    env_logger::init();
    log::info!("Starting Pulse application");

    pulse_lib::run()
}
