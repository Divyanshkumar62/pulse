use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub requests: Vec<Request>,
    pub folders: Vec<Folder>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub requests: Vec<Request>,
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
pub struct Request {
    pub id: String,
    pub name: String,
    pub method: String,
    pub protocol: Option<String>,
    pub url: String,
    pub headers: Vec<Header>,
    pub body: RequestBody,
    pub auth: Option<AuthConfig>,
    pub pre_request_script: Option<String>,
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
