use crate::collections::types::{Collection, Folder, Header, Request, RequestBody};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct PostmanCollection {
    pub info: PostmanInfo,
    #[serde(default)]
    pub item: Vec<PostmanItem>,
}

#[derive(Debug, Deserialize)]
pub struct PostmanInfo {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum PostmanItem {
    Request(PostmanRequest),
    Folder(PostmanFolder),
}

#[derive(Debug, Deserialize)]
pub struct PostmanRequest {
    pub name: String,
    pub request: InnerRequest,
}

#[derive(Debug, Deserialize)]
pub struct PostmanFolder {
    pub name: String,
    #[serde(default)]
    pub item: Vec<PostmanItem>,
}

#[derive(Debug, Deserialize)]
pub struct InnerRequest {
    pub method: String,
    pub url: PostmanUrl,
    #[serde(default)]
    pub header: Vec<PostmanHeader>,
    #[serde(default)]
    pub body: Option<PostmanBody>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum PostmanUrl {
    String(String),
    UrlObject { raw: String },
}

impl PostmanUrl {
    pub fn get_raw(&self) -> String {
        match self {
            PostmanUrl::String(s) => s.clone(),
            PostmanUrl::UrlObject { raw } => raw.clone(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct PostmanHeader {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Deserialize)]
pub struct PostmanBody {
    pub raw: Option<String>,
}

pub fn import_collection(json: &str) -> Result<Collection, String> {
    let postman: PostmanCollection = serde_json::from_str(json)
        .map_err(|e| format!("Failed to parse Postman collection: {}", e))?;

    let (requests, folders) = extract_items(postman.item);

    Ok(Collection {
        id: uuid::Uuid::new_v4().to_string(),
        name: postman.info.name,
        description: postman.info.description,
        requests,
        folders,
    })
}

fn request_from_postman(req: PostmanRequest) -> Request {
    Request {
        id: uuid::Uuid::new_v4().to_string(),
        name: req.name,
        method: req.request.method,
        url: req.request.url.get_raw(),
        headers: req
            .request
            .header
            .into_iter()
            .map(|h| Header {
                key: h.key,
                value: h.value,
            })
            .collect(),
        body: match req.request.body {
            Some(body) => RequestBody {
                r#type: "raw".to_string(),
                content: body.raw.unwrap_or_default(),
                graphql: None,
            },
            None => RequestBody {
                r#type: "none".to_string(),
                content: "".to_string(),
                graphql: None,
            },
        },
        auth: None,
        pre_request_script: None,
        protocol: None,
    }
}

fn extract_items(items: Vec<PostmanItem>) -> (Vec<Request>, Vec<Folder>) {
    let mut requests = Vec::new();
    let mut folders = Vec::new();

    for item in items {
        match item {
            PostmanItem::Request(req) => {
                requests.push(request_from_postman(req));
            }
            PostmanItem::Folder(folder) => {
                let (folder_requests, subfolders) = extract_items(folder.item);
                let folder_id = uuid::Uuid::new_v4().to_string();
                requests.extend(folder_requests.clone());
                folders.push(Folder {
                    id: folder_id.clone(),
                    name: folder.name,
                    requests: folder_requests,
                    folders: None,
                });
                folders.extend(subfolders);
            }
        }
    }

    (requests, folders)
}
