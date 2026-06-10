use std::collections::HashMap;
use crate::collections::types::{Collection, Request, Environment, Header, RequestBody};
use crate::http::client::send_request;
use crate::script_runner::{execute_js, ScriptContext, RequestInfo, ResponseInfo};

pub struct CollectionRunner {
    pub collection: Collection,
    pub environment: HashMap<String, String>,
    pub collection_variables: HashMap<String, String>,
    pub logs: Vec<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct RunResult {
    pub request_name: String,
    pub status: u16,
    pub time_ms: u64,
    pub tests: Vec<crate::script_runner::TestResult>,
    pub logs: Vec<String>,
}

impl CollectionRunner {
    pub fn new(collection: Collection, environment: Option<Environment>) -> Self {
        let mut env_map = HashMap::new();
        if let Some(env) = environment {
            for var in env.variables {
                if var.enabled {
                    env_map.insert(var.key, var.value);
                }
            }
        }

        Self {
            collection,
            environment: env_map,
            collection_variables: HashMap::new(),
            logs: Vec::new(),
        }
    }

    pub async fn run_all(&mut self) -> Vec<RunResult> {
        let mut results = Vec::new();
        let requests = self.collection.requests.clone();

        for req in requests {
            let result = self.run_request(&req).await;
            results.push(result);
        }

        results
    }

    pub async fn run_request(&mut self, req: &Request) -> RunResult {
        let mut current_logs = Vec::new();
        
        // 1. Resolve variables in URL (Initial)
        let mut resolved_url = self.resolve_variables(&req.url);

        // 2. Pre-request Script
        if let Some(script) = &req.pre_request_script {
            let context = ScriptContext {
                environment: self.environment.clone(),
                collection: self.collection_variables.clone(),
                request: RequestInfo {
                    url: resolved_url.clone(),
                    method: req.method.clone(),
                    headers: self.headers_to_map(&req.headers),
                },
                response: None,
            };

            match execute_js(script.clone(), context) {
                Ok(res) => {
                    self.environment = res.environment;
                    self.collection_variables = res.collection;
                    current_logs.extend(res.logs);
                    // Re-resolve URL in case script changed environment variables
                    resolved_url = self.resolve_variables(&req.url);
                }
                Err(e) => {
                    current_logs.push(format!("Pre-request Script Error: {}", e));
                }
            }
        }

        // 3. Resolve Headers and Body
        let resolved_headers = self.resolve_headers(&req.headers);
        let resolved_body = self.resolve_body(&req.body);

        // 4. Send Request
        let start_time = std::time::Instant::now();
        let response_res = send_request(
            req.method.clone(),
            resolved_url.clone(),
            resolved_headers,
            resolved_body,
            30,   // timeout
            true, // follow redirects
            true, // verify ssl
            false, // proxy enabled
            None,  // proxy url
        ).await;

        let elapsed = start_time.elapsed().as_millis() as u64;

        match response_res {
            Ok(resp) => {
                let mut tests = Vec::new();
                
                // 5. Test Script
                if let Some(script) = &req.test_script {
                    let context = ScriptContext {
                        environment: self.environment.clone(),
                        collection: self.collection_variables.clone(),
                        request: RequestInfo {
                            url: resolved_url.clone(),
                            method: req.method.clone(),
                            headers: self.headers_to_map(&req.headers),
                        },
                        response: Some(ResponseInfo {
                            status: resp.status,
                            body: resp.body.clone(),
                            headers: self.headers_to_map_from_resp(&resp.headers),
                        }),
                    };

                    match execute_js(script.clone(), context) {
                        Ok(res) => {
                            self.environment = res.environment;
                            self.collection_variables = res.collection;
                            current_logs.extend(res.logs);
                            tests = res.tests;
                        }
                        Err(e) => {
                            current_logs.push(format!("Test Script Error: {}", e));
                        }
                    }
                }

                RunResult {
                    request_name: req.name.clone(),
                    status: resp.status,
                    time_ms: elapsed,
                    tests,
                    logs: current_logs,
                }
            }
            Err(e) => {
                RunResult {
                    request_name: req.name.clone(),
                    status: 0,
                    time_ms: elapsed,
                    tests: Vec::new(),
                    logs: vec![format!("Request Failed: {}", e)],
                }
            }
        }
    }

    fn resolve_variables(&self, input: &str) -> String {
        let mut output = input.to_string();
        for (key, value) in &self.environment {
            let placeholder = format!("{{{{{}}}}}", key);
            output = output.replace(&placeholder, value);
        }
        for (key, value) in &self.collection_variables {
            let placeholder = format!("{{{{{}}}}}", key);
            output = output.replace(&placeholder, value);
        }
        output
    }

    fn resolve_headers(&self, headers: &[Header]) -> HashMap<String, String> {
        let mut map = HashMap::new();
        for h in headers {
            map.insert(h.key.clone(), self.resolve_variables(&h.value));
        }
        map
    }

    fn resolve_body(&self, body: &RequestBody) -> RequestBody {
        let mut resolved = body.clone();
        resolved.content = self.resolve_variables(&body.content);
        resolved
    }

    fn headers_to_map(&self, headers: &[Header]) -> HashMap<String, String> {
        headers.iter().map(|h| (h.key.clone(), h.value.clone())).collect()
    }

    fn headers_to_map_from_resp(&self, headers: &[crate::http::types::Header]) -> HashMap<String, String> {
        headers.iter().map(|h| (h.key.clone(), h.value.clone())).collect()
    }
}
