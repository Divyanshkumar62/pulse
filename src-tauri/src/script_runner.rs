use boa_engine::{
    object::ObjectInitializer, property::Attribute, Context, JsString, JsValue, NativeFunction,
    Source,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScriptContext {
    pub environment: HashMap<String, String>,
    pub collection: HashMap<String, String>,
    pub request: RequestInfo,
    pub response: Option<ResponseInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RequestInfo {
    pub url: String,
    pub method: String,
    pub headers: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResponseInfo {
    pub status: u16,
    pub body: String,
    pub headers: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScriptExecutionResult {
    pub environment: HashMap<String, String>,
    pub collection: HashMap<String, String>,
    pub logs: Vec<String>,
    pub tests: Vec<TestResult>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TestResult {
    pub name: String,
    pub passed: bool,
    pub message: Option<String>,
}

const SHIM: &str = r#"
    pm.expect = function(val) {
        const assertion = {
            to: {
                be: {
                    a: function(type) {
                        if (typeof val !== type) throw new Error(`Expected ${val} to be a ${type}`);
                        return assertion;
                    },
                    eql: function(other) {
                        if (JSON.stringify(val) !== JSON.stringify(other)) throw new Error(`Expected ${JSON.stringify(val)} to equal ${JSON.stringify(other)}`);
                        return assertion;
                    }
                },
                have: {
                    status: function(code) {
                        if (!pm.response) throw new Error("No response available for status check");
                        if (pm.response.code !== code) throw new Error(`Expected status ${code} but got ${pm.response.code}`);
                        return assertion;
                    }
                },
                include: function(item) {
                    if (Array.isArray(val) || typeof val === 'string') {
                        if (!val.includes(item)) throw new Error(`Expected ${JSON.stringify(val)} to include ${JSON.stringify(item)}`);
                    } else {
                        throw new Error("include() expects an array or string");
                    }
                    return assertion;
                }
            },
            not: {
                to: {
                    be: {
                        eql: function(other) {
                            if (JSON.stringify(val) === JSON.stringify(other)) throw new Error(`Expected ${JSON.stringify(val)} NOT to equal ${JSON.stringify(other)}`);
                            return assertion;
                        }
                    }
                }
            }
        };
        return assertion;
    };
"#;

#[tauri::command]
pub fn run_script(
    script: String,
    context: ScriptContext,
) -> Result<ScriptExecutionResult, String> {
    execute_js(script, context)
}

pub fn evaluate_boolean_script(
    script: String,
    context_data: ScriptContext,
) -> Result<bool, String> {
    let mut context = Context::default();

    // Setup pm object (minimal for logic evaluation)
    let pm = ObjectInitializer::new(&mut context).build();
    context.register_global_property(JsString::from("pm"), pm, Attribute::all());

    // Add environment and collection variables to context as global vars for easy access
    for (k, v) in &context_data.environment {
        let _ = context.register_global_property(JsString::from(k.as_str()), JsString::from(v.clone()), Attribute::all());
    }
    for (k, v) in &context_data.collection {
        let _ = context.register_global_property(JsString::from(k.as_str()), JsString::from(v.clone()), Attribute::all());
    }

    let result = context
        .eval(Source::from_bytes(script.as_bytes()))
        .map_err(|e| format!("Logic Error: {}", e))?;

    Ok(result.to_boolean())
}

pub fn execute_js(
    script: String,
    context_data: ScriptContext,
) -> Result<ScriptExecutionResult, String> {
    let mut context = Context::default();

    // 1. Setup Logging
    let logs = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
    let logs_clone = logs.clone();

    let console_log_fn = unsafe {
        NativeFunction::from_closure(move |_this, args, _context| {
            let mut logs = logs_clone.lock().unwrap();
            for arg in args {
                logs.push(arg.display().to_string());
            }
            Ok(JsValue::undefined())
        })
    };

    let console = ObjectInitializer::new(&mut context)
        .function(console_log_fn, JsString::from("log"), 0)
        .build();
    context.register_global_property(JsString::from("console"), console, Attribute::all());

    // 2. Setup pm object with environment
    let env_data = std::sync::Arc::new(std::sync::Mutex::new(context_data.environment.clone()));
    let env_data_get = env_data.clone();
    let env_data_set = env_data.clone();

    let env_get_fn = unsafe {
        NativeFunction::from_closure(move |_this, args, _context| {
            let key = args
                .get(0)
                .and_then(|v| v.as_string())
                .map(|s| s.to_std_string_escaped())
                .unwrap_or_default();
            let val = env_data_get
                .lock()
                .unwrap()
                .get(&key)
                .cloned()
                .unwrap_or_default();
            Ok(JsValue::new(JsString::from(val)))
        })
    };

    let env_set_fn = unsafe {
        NativeFunction::from_closure(move |_this, args, _context| {
            let key = args
                .get(0)
                .and_then(|v| v.as_string())
                .map(|s| s.to_std_string_escaped())
                .unwrap_or_default();
            let val = args
                .get(1)
                .and_then(|v| v.as_string())
                .map(|s| s.to_std_string_escaped())
                .unwrap_or_default();
            env_data_set.lock().unwrap().insert(key, val);
            Ok(JsValue::undefined())
        })
    };

    let env_obj = ObjectInitializer::new(&mut context)
        .function(env_get_fn, JsString::from("get"), 1)
        .function(env_set_fn, JsString::from("set"), 2)
        .build();

    // Setup collection variables
    let col_data = std::sync::Arc::new(std::sync::Mutex::new(context_data.collection.clone()));
    let col_data_get = col_data.clone();
    let col_data_set = col_data.clone();

    let col_get_fn = unsafe {
        NativeFunction::from_closure(move |_this, args, _context| {
            let key = args
                .get(0)
                .and_then(|v| v.as_string())
                .map(|s| s.to_std_string_escaped())
                .unwrap_or_default();
            let val = col_data_get
                .lock()
                .unwrap()
                .get(&key)
                .cloned()
                .unwrap_or_default();
            Ok(JsValue::new(JsString::from(val)))
        })
    };

    let col_set_fn = unsafe {
        NativeFunction::from_closure(move |_this, args, _context| {
            let key = args
                .get(0)
                .and_then(|v| v.as_string())
                .map(|s| s.to_std_string_escaped())
                .unwrap_or_default();
            let val = args
                .get(1)
                .and_then(|v| v.as_string())
                .map(|s| s.to_std_string_escaped())
                .unwrap_or_default();
            col_data_set.lock().unwrap().insert(key, val);
            Ok(JsValue::undefined())
        })
    };

    let col_obj = ObjectInitializer::new(&mut context)
        .function(col_get_fn, JsString::from("get"), 1)
        .function(col_set_fn, JsString::from("set"), 2)
        .build();

    // Setup response object if available
    let resp_obj = if let Some(resp) = &context_data.response {
        let headers_data = resp.headers.clone();
        let mut headers_builder = ObjectInitializer::new(&mut context);
        for (k, v) in &headers_data {
            headers_builder.property(
                JsString::from(k.as_str()),
                JsString::from(v.clone()),
                Attribute::all(),
            );
        }
        let headers_obj = headers_builder.build();

        let json_fn = unsafe {
            NativeFunction::from_closure(move |_this, _args, context| {
                let body = context.global_object()
                    .get(JsString::from("pm"), context)?
                    .as_object().unwrap()
                    .get(JsString::from("response"), context)?
                    .as_object().unwrap()
                    .get(JsString::from("body"), context)?
                    .as_string().unwrap()
                    .to_std_string_escaped();
                
                if let Ok(_json) = serde_json::from_str::<serde_json::Value>(&body) {
                    Ok(JsValue::undefined()) 
                } else {
                    Ok(JsValue::undefined())
                }
            })
        };

        Some(
            ObjectInitializer::new(&mut context)
                .property(
                    JsString::from("code"),
                    JsValue::new(resp.status),
                    Attribute::all(),
                )
                .property(
                    JsString::from("body"),
                    JsString::from(resp.body.clone()),
                    Attribute::all(),
                )
                .property(JsString::from("headers"), headers_obj, Attribute::all())
                .function(json_fn, JsString::from("json"), 0)
                .build(),
        )
    } else {
        None
    };

    // Setup tests collection
    let tests = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
    let tests_clone = tests.clone();

    let test_fn = unsafe {
        NativeFunction::from_closure(move |_this, args, context| {
            let name = args
                .get(0)
                .and_then(|v| v.as_string())
                .map(|s| s.to_std_string_escaped())
                .unwrap_or_else(|| "Unnamed test".to_string());
            let func = args.get(1).and_then(|v| v.as_object()).map(|o| o.clone());

            let mut passed = false;
            let mut message = None;

            if let Some(f) = func {
                match f.call(&JsValue::undefined(), &[], context) {
                    Ok(_) => passed = true,
                    Err(e) => {
                        passed = false;
                        message = Some(format!("{}", e));
                    }
                }
            }

            tests_clone.lock().unwrap().push(TestResult {
                name,
                passed,
                message,
            });
            Ok(JsValue::undefined())
        })
    };

    // Build pm object
    let mut pm_init = ObjectInitializer::new(&mut context);
    pm_init.property(JsString::from("environment"), env_obj, Attribute::all());
    pm_init.property(
        JsString::from("collectionVariables"),
        col_obj,
        Attribute::all(),
    );
    pm_init.function(test_fn, JsString::from("test"), 2);

    // Add response if available
    if let Some(resp_obj) = resp_obj {
        pm_init.property(JsString::from("response"), resp_obj, Attribute::all());
    }

    let pm = pm_init.build();
    let _ = context.register_global_property(JsString::from("pm"), pm, Attribute::all());

    // Execute Shim
    context
        .eval(Source::from_bytes(SHIM.as_bytes()))
        .map_err(|e| format!("Shim Error: {}", e))?;

    // Execute Script
    context
        .eval(Source::from_bytes(script.as_bytes()))
        .map_err(|e| format!("{}", e))?;

    // Extract values before returning
    let result_environment = env_data.lock().unwrap().clone();
    let result_collection = col_data.lock().unwrap().clone();
    let result_logs = logs.lock().unwrap().clone();
    let result_tests = tests.lock().unwrap().clone();

    Ok(ScriptExecutionResult {
        environment: result_environment,
        collection: result_collection,
        logs: result_logs,
        tests: result_tests,
    })
}
