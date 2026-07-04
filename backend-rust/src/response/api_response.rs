use axum::Json;
use serde::Serialize;
use serde_json::{Value, json};

#[derive(Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(flatten)]
    pub payload: T,
}

pub fn ok(payload: Value) -> Json<Value> {
    Json(match payload {
        Value::Object(mut map) => {
            map.insert("success".to_string(), Value::Bool(true));
            Value::Object(map)
        }
        value => json!({ "success": true, "data": value }),
    })
}

pub fn created(message: &str, data: Value) -> Json<Value> {
    Json(json!({ "success": true, "message": message, "data": data }))
}
