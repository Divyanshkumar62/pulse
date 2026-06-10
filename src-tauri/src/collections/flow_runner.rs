use std::collections::{HashMap, VecDeque};
use crate::collections::types::{Flow, FlowNode, FlowEdge, Environment, HistoryResponse, Header};
use crate::http::client::send_request;
use crate::script_runner::{evaluate_boolean_script, ScriptContext, RequestInfo};
use tauri::{Window, Emitter};
use serde::{Serialize, Deserialize};
use async_recursion::async_recursion;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FlowNodeStatusEvent {
    pub flow_id: String,
    pub node_id: String,
    pub status: String, // "running", "success", "error", "idle"
    pub last_response: Option<HistoryResponse>,
    pub triggered_handle: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FlowLogEvent {
    pub flow_id: String,
    pub node_id: String,
    pub message: String,
    pub level: String, // "info", "success", "error", "warn"
}

pub struct FlowRunner {
    pub flow: Flow,
    pub environment: HashMap<String, String>,
    pub variables: HashMap<String, String>,
    pub window: Window,
}

impl FlowRunner {
    pub fn new(flow: Flow, env: Option<Environment>, window: Window) -> Self {
        let mut environment = HashMap::new();
        if let Some(e) = env {
            for var in e.variables {
                if var.enabled {
                    environment.insert(var.key, var.value);
                }
            }
        }

        Self {
            flow,
            environment,
            variables: HashMap::new(),
            window,
        }
    }

    pub async fn run(&mut self) -> Result<(), String> {
        self.emit_log("system", "Starting flow execution...", "info");

        for node in &self.flow.nodes {
            self.emit_status(&node.id, "idle", None, None);
        }

        let mut adj: HashMap<String, Vec<FlowEdge>> = HashMap::new();
        let mut in_degree: HashMap<String, usize> = HashMap::new();
        for node in &self.flow.nodes {
            in_degree.insert(node.id.clone(), 0);
        }
        for edge in &self.flow.edges {
            adj.entry(edge.source.clone()).or_insert(Vec::new()).push(edge.clone());
            *in_degree.entry(edge.target.clone()).or_insert(0) += 1;
        }

        let mut queue = VecDeque::new();
        for (node_id, degree) in &in_degree {
            if *degree == 0 {
                queue.push_back(node_id.clone());
            }
        }

        while let Some(node_id) = queue.pop_front() {
            let node = match self.flow.nodes.iter().find(|n| n.id == node_id) {
                Some(n) => n.clone(),
                None => continue,
            };

            let result = self.execute_node(&node).await?;
            
            let target_handles = match node.r#type.as_str() {
                "logic" => {
                    if result.as_deref() == Some("true") { vec![Some("true".to_string())] } else { vec![Some("false".to_string())] }
                },
                "assertion" => {
                    if result.as_deref() == Some("passed") { vec![Some("passed".to_string())] } else { vec![Some("failed".to_string())] }
                },
                "request" => {
                    if result.as_deref() == Some("success") { vec![Some("success".to_string())] } else { vec![Some("failure".to_string())] }
                },
                "loop" => {
                    vec![Some("done".to_string())]
                }
                _ => vec![None],
            };

            if let Some(edges) = adj.get(&node_id) {
                for edge in edges {
                    let should_follow = target_handles.iter().any(|h| {
                        match h {
                            Some(handle_id) => edge.source_handle.as_ref().map_or(false, |sh| sh == handle_id),
                            None => edge.source_handle.is_none(),
                        }
                    });

                    if should_follow {
                        queue.push_back(edge.target.clone());
                    }
                }
            }
        }

        self.emit_log("system", "Flow execution completed.", "success");
        Ok(())
    }

    #[async_recursion]
    async fn execute_node(&mut self, node: &FlowNode) -> Result<Option<String>, String> {
        self.emit_status(&node.id, "running", None, None);
        
        match node.r#type.as_str() {
            "request" => {
                match self.run_request_node(node).await {
                    Ok(res) => {
                        self.emit_status(&node.id, "success", Some(res), Some("success".to_string()));
                        Ok(Some("success".to_string()))
                    },
                    Err(e) => {
                        self.emit_log(&node.id, &e, "error");
                        self.emit_status(&node.id, "error", None, Some("failure".to_string()));
                        Ok(Some("failure".to_string()))
                    }
                }
            },
            "logic" => {
                let condition = node.data.condition.as_deref().unwrap_or("true");
                let is_true = self.evaluate_logic(condition).await?;
                let handle = if is_true { "true" } else { "false" };
                self.emit_status(&node.id, if is_true { "success" } else { "error" }, None, Some(handle.to_string()));
                self.emit_log(&node.id, &format!("Condition '{}' evaluated to {}", condition, is_true), "info");
                Ok(Some(handle.to_string()))
            },
            "assertion" => {
                let condition = node.data.condition.as_deref().unwrap_or("true");
                let is_true = self.evaluate_logic(condition).await?;
                let handle = if is_true { "passed" } else { "failed" };
                self.emit_status(&node.id, if is_true { "success" } else { "error" }, None, Some(handle.to_string()));
                self.emit_log(&node.id, &format!("Assertion '{}' {}", condition, if is_true { "passed" } else { "failed" }), if is_true { "success" } else { "error" });
                Ok(Some(handle.to_string()))
            },
            "loop" => {
                self.run_loop_node(node).await?;
                self.emit_status(&node.id, "success", None, Some("done".to_string()));
                Ok(Some("done".to_string()))
            },
            "delay" => {
                let ms = node.data.delay_ms.unwrap_or(1000);
                tokio::time::sleep(tokio::time::Duration::from_millis(ms)).await;
                self.emit_status(&node.id, "success", None, None);
                Ok(None)
            },
            "start" | "end" => {
                self.emit_status(&node.id, "success", None, None);
                Ok(None)
            },
            _ => {
                self.emit_log(&node.id, &format!("Unknown node type: {}", node.r#type), "warn");
                self.emit_status(&node.id, "success", None, None);
                Ok(None)
            }
        }
    }

    async fn run_loop_node(&mut self, node: &FlowNode) -> Result<(), String> {
        let loop_over = node.data.loop_over.as_deref().unwrap_or("");
        let loop_var = node.data.loop_var.as_deref().unwrap_or("item");
        
        let resolved_over = self.resolve_variables(loop_over);
        
        let items: Vec<serde_json::Value> = if resolved_over.starts_with('[') {
            serde_json::from_str(&resolved_over).unwrap_or_else(|_| vec![])
        } else {
            vec![]
        };

        self.emit_log(&node.id, &format!("Looping over {} items", items.len()), "info");

        for (i, item) in items.iter().enumerate() {
            self.emit_log(&node.id, &format!("Iteration {}", i + 1), "info");
            self.variables.insert(loop_var.to_string(), item.to_string());
            
            let each_nodes: Vec<String> = self.flow.edges.iter()
                .filter(|e| e.source == node.id && e.source_handle.as_deref() == Some("each"))
                .map(|e| e.target.clone())
                .collect();

            for target_id in each_nodes {
                self.run_sub_flow(&target_id).await?;
            }
        }

        Ok(())
    }

    async fn run_sub_flow(&mut self, start_node_id: &str) -> Result<(), String> {
        let mut curr_id = start_node_id.to_string();
        loop {
            let node = match self.flow.nodes.iter().find(|n| n.id == curr_id) {
                Some(n) => n.clone(),
                None => break,
            };
            
            self.execute_node(&node).await?;
            
            let next = self.flow.edges.iter()
                .find(|e| e.source == curr_id && e.source_handle.is_none());
            
            if let Some(edge) = next {
                curr_id = edge.target.clone();
            } else {
                break;
            }
        }
        Ok(())
    }

    async fn run_request_node(&mut self, node: &FlowNode) -> Result<HistoryResponse, String> {
        let method = node.data.method.as_deref().unwrap_or("GET");
        let url = node.data.url.as_deref().unwrap_or_default();
        let resolved_url = self.resolve_variables(url);

        let mut headers = HashMap::new();
        if let Some(h_list) = &node.data.headers {
            for h in h_list {
                if h.enabled {
                    headers.insert(h.key.clone(), self.resolve_variables(&h.value));
                }
            }
        }

        let body_content = node.data.body.as_deref().unwrap_or_default();
        let body = crate::collections::types::RequestBody {
            r#type: "none".to_string(),
            content: self.resolve_variables(body_content),
            graphql: None,
        };

        let response = send_request(method.to_string(), resolved_url, headers, body, 30, true, true, false, None).await
            .map_err(|e| format!("Request failed: {}", e))?;

        let history_resp = HistoryResponse {
            status: response.status,
            status_text: response.status_text,
            headers: response.headers.into_iter().map(|h| Header { key: h.key, value: h.value }).collect(),
            body: response.body,
            time_ms: 0,
        };

        if let Some(mappings) = &node.data.mappings {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&history_resp.body) {
                for m in mappings {
                    if let Some(val) = self.get_json_path(&json, &m.source_path) {
                        self.variables.insert(m.target_var.clone(), val);
                    }
                }
            }
        }

        Ok(history_resp)
    }

    async fn evaluate_logic(&self, condition: &str) -> Result<bool, String> {
        let context = ScriptContext {
            environment: self.environment.clone(),
            collection: self.variables.clone(),
            request: RequestInfo { url: "".to_string(), method: "".to_string(), headers: HashMap::new() },
            response: None,
        };
        evaluate_boolean_script(condition.to_string(), context)
    }

    fn resolve_variables(&self, input: &str) -> String {
        let mut output = input.to_string();
        for (k, v) in &self.environment {
            output = output.replace(&format!("{{{{{}}}}}", k), v);
        }
        for (k, v) in &self.variables {
            output = output.replace(&format!("{{{{{}}}}}", k), v);
        }
        output
    }

    fn get_json_path(&self, json: &serde_json::Value, path: &str) -> Option<String> {
        let mut curr = json;
        for part in path.split('.') {
            if part.is_empty() { continue; }
            curr = curr.get(part)?;
        }
        match curr {
            serde_json::Value::String(s) => Some(s.clone()),
            _ => Some(curr.to_string()),
        }
    }

    fn emit_status(&self, node_id: &str, status: &str, resp: Option<HistoryResponse>, handle: Option<String>) {
        let _ = self.window.emit("flow-node-status", FlowNodeStatusEvent {
            flow_id: self.flow.id.clone(),
            node_id: node_id.to_string(),
            status: status.to_string(),
            last_response: resp,
            triggered_handle: handle,
        });
    }

    fn emit_log(&self, node_id: &str, message: &str, level: &str) {
        let _ = self.window.emit("flow-log", FlowLogEvent {
            flow_id: self.flow.id.clone(),
            node_id: node_id.to_string(),
            message: message.to_string(),
            level: level.to_string(),
        });
    }
}

#[tauri::command]
pub async fn run_flow(flow: Flow, environment: Option<Environment>, window: Window) -> Result<(), String> {
    let mut runner = FlowRunner::new(flow, environment, window);
    runner.run().await
}
