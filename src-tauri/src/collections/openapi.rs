use crate::collections::types::{Collection, Request, RequestBody};
use openapiv3::{OpenAPI, Operation, ReferenceOr};
use uuid::Uuid;

pub fn import_openapi(content: &str) -> Result<Collection, String> {
    let openapi: OpenAPI = serde_yaml::from_str(content)
        .map_err(|e| format!("Failed to parse OpenAPI spec: {}", e))?;

    let mut requests = Vec::new();
    let title = openapi.info.title.clone();
    let description = openapi.info.description.clone();

    for (path, path_item) in openapi.paths.iter() {
        if let ReferenceOr::Item(item) = path_item {
            add_operation(&mut requests, path, "GET", &item.get);
            add_operation(&mut requests, path, "POST", &item.post);
            add_operation(&mut requests, path, "PUT", &item.put);
            add_operation(&mut requests, path, "DELETE", &item.delete);
            add_operation(&mut requests, path, "PATCH", &item.patch);
            add_operation(&mut requests, path, "OPTIONS", &item.options);
            add_operation(&mut requests, path, "HEAD", &item.head);
        }
    }

    Ok(Collection {
        id: Uuid::new_v4().to_string(),
        name: title,
        description,
        requests,
        folders: Vec::new(),
        variables: None,
        pinned: None,
        auth: None,
        pre_request_script: None,
        test_script: None,
    })
}

fn add_operation(requests: &mut Vec<Request>, path: &str, method: &str, operation: &Option<Operation>) {
    if let Some(op) = operation {
        let name = op.summary.clone().unwrap_or_else(|| format!("{} {}", method, path));
        
        let mut response_schema = None;
        if let Some(ReferenceOr::Item(resp)) = op.responses.responses.get(&openapiv3::StatusCode::Code(200))
            .or_else(|| op.responses.responses.get(&openapiv3::StatusCode::Code(201)))
        {
            if let Some(media_type) = resp.content.get("application/json") {
                if let Some(schema_ref) = &media_type.schema {
                    if let Ok(schema_str) = serde_json::to_string(schema_ref) {
                        response_schema = Some(schema_str);
                    }
                }
            }
        }

        requests.push(Request {
            id: Uuid::new_v4().to_string(),
            name,
            method: method.to_string(),
            url: format!("{{{{base_url}}}}{}", path),
            headers: Vec::new(),
            body: RequestBody {
                r#type: "none".to_string(),
                content: "".to_string(),
                graphql: None,
            },
            auth: None,
            pre_request_script: None,
            test_script: None,
            protocol: Some("http".to_string()),
            response_schema,
            params: None,
            use_cookies: None,
            proxy_override: None,
        });
    }
}
