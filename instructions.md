Step 1: Set up the Folders
Open your project in your AI IDE and create this exact folder structure inside src-tauri/src/. Rust is very strict about file paths!

In src-tauri/src/, create a folder named http.

In src-tauri/src/, create a folder named collections.

Inside those, create these empty files:

src-tauri/src/http/mod.rs (We'll add this to "register" the folder)

src-tauri/src/http/types.rs

src-tauri/src/http/error.rs

src-tauri/src/http/client.rs

src-tauri/src/collections/mod.rs

src-tauri/src/collections/types.rs

src-tauri/src/collections/loader.rs


Step 2: The "Copy-Paste" Sprint
Now, drop the code Claude gave you into those files. Here is the order that makes the most sense:

Dependencies: Open src-tauri/Cargo.toml. Replace your [dependencies] section with the one Claude provided. Important: Run cargo build in your terminal afterward to let Rust download everything.

The Types: Paste the code for http/types.rs and collections/types.rs.

The Logic: Paste http/error.rs, http/client.rs, and collections/loader.rs.

The "Glue" Files:

In src-tauri/src/http/mod.rs, paste:

Rust
pub mod client;
pub mod error;
pub mod types;
In src-tauri/src/collections/mod.rs, paste:

Rust
pub mod loader;
pub mod types;
The Main Entry: Replace your src-tauri/src/main.rs with Claude's version.
