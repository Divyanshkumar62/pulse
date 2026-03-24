use serde_json::{json, Value};
use crate::collections::types::{Collection, Folder, Request, Header};

pub fn to_postman_v21(collection: &Collection) -> Value {
    let mut items = Vec::new();

    // Process top-level requests
    for req in &collection.requests {
        items.push(request_to_postman_item(req));
    }

    // Process folders
    for folder in &collection.folders {
        items.push(folder_to_postman_item(folder));
    }

    json!({
        "info": {
            "_postman_id": collection.id,
            "name": collection.name,
            "description": collection.description,
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": items
    })
}

fn folder_to_postman_item(folder: &Folder) -> Value {
    let mut items = Vec::new();

    for req in &folder.requests {
        items.push(request_to_postman_item(req));
    }

    // Note: If our Folder struct supports nested folders in the future, 
    // we would handle recursion here.

    json!({
        "name": folder.name,
        "item": items
    })
}

fn request_to_postman_item(req: &Request) -> Value {
    let headers: Vec<Value> = req.headers.iter().map(|h| {
        json!({
            "key": h.key,
            "value": h.value,
            "type": "text"
        })
    }).collect();

    let mut url_parsed = json!({
        "raw": req.url
    });

    // Simple URL decomposition for Postman compatibility
    if let Ok(url) = url::Url::parse(&req.url) {
        let host: Vec<&str> = url.host_str().unwrap_or("").split('.').collect();
        let path: Vec<&str> = url.path().trim_start_matches('/').split('/').collect();
        
        let query: Vec<Value> = url.query_pairs().map(|(k, v)| {
            json!({
                "key": k,
                "value": v
            })
        }).collect();

        url_parsed = json!({
            "raw": req.url,
            "protocol": url.scheme(),
            "host": host,
            "path": path,
            "query": query
        });
    }

    let mut body_json = json!({});
    if req.body.r#type != "none" {
        body_json = json!({
            "mode": if req.body.r#type == "json" { "raw" } else { "raw" },
            "raw": req.body.content,
            "options": {
                "raw": {
                    "language": if req.body.r#type == "json" { "json" } else { "text" }
                }
            }
        });
    }

    let mut auth_json = json!(null);
    if let Some(auth) = &req.auth {
        match auth.r#type.as_str() {
            "bearer" => {
                if let Some(config) = &auth.config {
                    let token = config.get("token").and_then(|t| t.as_str()).unwrap_or("");
                    auth_json = json!({
                        "type": "bearer",
                        "bearer": [
                            {
                                "key": "token",
                                "value": token,
                                "type": "string"
                            }
                        ]
                    });
                }
            },
            _ => {}
        }
    }

    json!({
        "name": req.name,
        "request": {
            "method": req.method,
            "header": headers,
            "url": url_parsed,
            "body": body_json,
            "auth": auth_json
        },
        "response": []
    })
}

pub fn to_openapi_v3(collection: &Collection) -> Value {
    let mut paths = json!({});
    
    // Process all requests in the collection
    for req in &collection.requests {
        add_request_to_openapi_paths(&mut paths, req);
    }

    // Process all requests in folders
    for folder in &collection.folders {
        for req in &folder.requests {
            add_request_to_openapi_paths(&mut paths, req);
        }
    }

    json!({
        "openapi": "3.0.0",
        "info": {
            "title": collection.name,
            "description": collection.description.clone().unwrap_or_default(),
            "version": "1.0.0"
        },
        "paths": paths
    })
}

fn add_request_to_openapi_paths(paths: &mut Value, req: &Request) {
    let url_obj = url::Url::parse(&req.url).ok();
    let path_str = url_obj.map(|u| u.path().to_string()).unwrap_or_else(|| "/".to_string());
    let method = req.method.to_lowercase();

    if paths.get(&path_str).is_none() {
        paths[path_str.clone()] = json!({});
    }

    let mut operation = json!({
        "summary": req.name,
        "responses": {
            "200": {
                "description": "Successful response"
            }
        }
    });

    // Add headers as parameters
    let mut parameters = Vec::new();
    for header in &req.headers {
        parameters.push(json!({
            "name": header.key,
            "in": "header",
            "schema": { "type": "string" },
            "example": header.value
        }));
    }

    // Add query params if URL is parsable
    if let Some(url) = url_obj {
        for (key, value) in url.query_pairs() {
            parameters.push(json!({
                "name": key,
                "in": "query",
                "schema": { "type": "string" },
                "example": value
            }));
        }
    }

    if !parameters.is_empty() {
        operation["parameters"] = json!(parameters);
    }

    // Basic body support
    if req.body.r#type != "none" {
        operation["requestBody"] = json!({
            "content": {
                "application/json": {
                    "schema": { "type": "object" },
                    "example": req.body.content
                }
            }
        });
    }

    paths[&path_str][method] = operation;
}
