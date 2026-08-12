use serde::{Deserialize, Serialize};

use crate::http::types::ProxyOverride;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Collection {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    pub requests: Vec<Request>,
    pub folders: Vec<Folder>,
    #[serde(default)]
    pub variables: Option<Vec<CollectionVariable>>,
    #[serde(default)]
    pub pinned: Option<bool>,
    #[serde(default)]
    pub auth: Option<AuthConfig>,
    #[serde(alias = "pre_request_script")]
    pub pre_request_script: Option<String>,
    #[serde(alias = "test_script")]
    pub test_script: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub requests: Vec<Request>,
    #[serde(default)]
    pub folders: Option<Vec<Folder>>,
    #[serde(default)]
    pub pinned: Option<bool>,
    #[serde(default)]
    pub auth: Option<AuthConfig>,
    #[serde(alias = "pre_request_script")]
    pub pre_request_script: Option<String>,
    #[serde(alias = "test_script")]
    pub test_script: Option<String>,
}

/// A collection-scoped variable. `enabled` is optional so old files without
/// the flag keep their variables enabled.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionVariable {
    pub key: String,
    pub value: String,
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub secret: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphQLConfig {
    pub query: String,
    pub variables: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestBody {
    pub r#type: String,
    pub content: String,
    pub graphql: Option<GraphQLConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    pub r#type: String,
    pub config: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Request {
    pub id: String,
    pub name: String,
    pub method: String,
    #[serde(default)]
    pub protocol: Option<String>,
    pub url: String,
    #[serde(default)]
    pub params: Option<Vec<Header>>,
    pub headers: Vec<Header>,
    pub body: RequestBody,
    #[serde(default)]
    pub auth: Option<AuthConfig>,
    #[serde(alias = "pre_request_script")]
    pub pre_request_script: Option<String>,
    #[serde(alias = "test_script")]
    pub test_script: Option<String>,
    #[serde(alias = "response_schema")]
    pub response_schema: Option<String>,
    #[serde(default)]
    pub use_cookies: Option<bool>,
    #[serde(default)]
    pub proxy_override: Option<ProxyOverride>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Header {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Environment {
    pub id: String,
    pub name: String,
    pub variables: Vec<EnvVariable>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvVariable {
    pub key: String,
    pub value: String,
    pub enabled: bool,
    pub description: Option<String>,
    pub secret: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub timestamp: String,
    pub method: String,
    pub url: String,
    pub status: u16,
    pub time_ms: u64,
    pub request: HistoryRequest,
    pub response: HistoryResponse,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryRequest {
    pub method: String,
    pub url: String,
    pub headers: Vec<Header>,
    pub body: RequestBody,
    pub pre_request_script: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: Vec<Header>,
    pub body: String,
    pub time_ms: u64,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Flow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub environment_id: Option<String>,
    pub nodes: Vec<FlowNode>,
    pub edges: Vec<FlowEdge>,
    pub workspace_id: String,
    pub created_at: Option<u64>,
    pub updated_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlowNode {
    pub id: String,
    pub r#type: String,
    pub position: Position,
    pub data: FlowNodeData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlowNodeData {
    pub name: String,
    pub request_id: Option<String>,
    pub url: Option<String>,
    pub method: Option<String>,
    pub delay_ms: Option<u64>,
    pub condition: Option<String>,
    pub loop_over: Option<String>,
    pub loop_var: Option<String>,
    pub headers: Option<Vec<FlowHeader>>,
    pub mappings: Option<Vec<FlowNodeMapping>>,
    pub body: Option<String>,
    pub status: Option<String>,
    pub last_response: Option<HistoryResponse>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlowHeader {
    pub id: String,
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlowNodeMapping {
    pub source_path: String,
    pub target_var: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlowEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub source_handle: Option<String>,
    pub target_handle: Option<String>,
    pub animated: Option<bool>,
}
