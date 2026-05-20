use clap::Parser;
use pulse_lib::collections::loader;
use pulse_lib::collections::runner::CollectionRunner;
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Path to the collection file (.json or .yaml)
    #[arg(short, long)]
    collection: PathBuf,

    /// Path to the environment file (.yaml)
    #[arg(short, long)]
    environment: Option<PathBuf>,

    /// Output format (pretty, json)
    #[arg(short, long, default_value = "pretty")]
    output: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    // 1. Load Collection
    let collection = loader::load_from_file(&args.collection)
        .map_err(|e| format!("Failed to load collection: {}", e))?;

    // 2. Load Environment (optional)
    let environment = if let Some(env_path) = args.environment {
        let envs = loader::load_environments(&env_path)
            .map_err(|e| format!("Failed to load environment: {}", e))?;
        envs.into_iter().next() // Take the first environment for now
    } else {
        None
    };

    println!("🚀 Running Collection: {}", collection.name);
    println!("------------------------------------------");

    // 3. Initialize Runner
    let mut runner = CollectionRunner::new(collection, environment);

    // 4. Run All Requests
    let results = runner.run_all().await;

    // 5. Output Results
    let mut total_passed = 0;
    let mut total_failed = 0;

    for res in results {
        println!("\nRequest: {} [{}] ({}ms)", res.request_name, res.status, res.time_ms);
        
        for log in res.logs {
            println!("  📄 {}", log);
        }

        for test in res.tests {
            if test.passed {
                println!("  ✅ PASS: {}", test.name);
                total_passed += 1;
            } else {
                println!("  ❌ FAIL: {}: {}", test.name, test.message.unwrap_or_default());
                total_failed += 1;
            }
        }
    }

    println!("\n------------------------------------------");
    println!("Summary: {} passed, {} failed", total_passed, total_failed);

    if total_failed > 0 {
        std::process::exit(1);
    }

    Ok(())
}
