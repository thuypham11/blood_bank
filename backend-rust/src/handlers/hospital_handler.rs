use crate::{
    dto::hospital::{
        confirm_handover::ContactAttemptDto, create_usage::CreateUsageDto, dashboard::DonorQuery,
        request_blood::RequestBloodDto,
    },
    errors::app_error::AppError,
    middleware::auth::AuthFacility,
    response::api_response,
    services::hospital_service,
    state::AppState,
};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use serde_json::json;

pub async fn public_blood_needs(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(api_response::ok(
        hospital_service::public_blood_needs(state.db()).await?,
    ))
}

pub async fn request_blood(
    State(state): State<AppState>,
    auth: AuthFacility,
    Json(payload): Json<RequestBloodDto>,
) -> Result<(StatusCode, Json<serde_json::Value>), AppError> {
    let request = hospital_service::request_blood(state.db(), &auth.id, payload).await?;
    Ok((
        StatusCode::CREATED,
        api_response::created("Yeu cau da duoc gui thanh cong", request),
    ))
}

pub async fn get_requests(
    State(state): State<AppState>,
    auth: AuthFacility,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(api_response::ok(
        hospital_service::get_requests(state.db(), &auth.id).await?,
    ))
}

pub async fn dashboard(
    State(state): State<AppState>,
    auth: AuthFacility,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(api_response::ok(
        hospital_service::dashboard(state.db(), &auth.id).await?,
    ))
}

pub async fn stock(
    State(state): State<AppState>,
    auth: AuthFacility,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(api_response::ok(
        hospital_service::stock(state.db(), &auth.id).await?,
    ))
}

pub async fn stock_history(
    State(state): State<AppState>,
    auth: AuthFacility,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(api_response::ok(
        hospital_service::stock_history(state.db(), &auth.id).await?,
    ))
}

pub async fn create_usage(
    State(state): State<AppState>,
    auth: AuthFacility,
    Json(payload): Json<CreateUsageDto>,
) -> Result<(StatusCode, Json<serde_json::Value>), AppError> {
    let usage = hospital_service::create_usage(state.db(), &auth.id, payload).await?;
    Ok((
        StatusCode::CREATED,
        api_response::created("Quy trinh su dung mau da duoc luu lai", usage),
    ))
}

pub async fn history(
    State(state): State<AppState>,
    auth: AuthFacility,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(api_response::ok(
        hospital_service::history(state.db(), &auth.id).await?,
    ))
}

pub async fn confirm_handover(
    State(state): State<AppState>,
    auth: AuthFacility,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let request = hospital_service::confirm_handover(state.db(), &auth.id, &id).await?;
    Ok(api_response::ok(json!({
        "message": "Viec giao mau can duoc xac nhan",
        "data": request,
    })))
}

pub async fn donors(
    State(state): State<AppState>,
    _auth: AuthFacility,
    Query(query): Query<DonorQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(api_response::ok(
        hospital_service::donors(state.db(), query).await?,
    ))
}

pub async fn log_contact_attempt(
    State(state): State<AppState>,
    auth: AuthFacility,
    Path(id): Path<String>,
    Json(payload): Json<ContactAttemptDto>,
) -> Result<Json<serde_json::Value>, AppError> {
    hospital_service::log_contact(state.db(), &auth.id, &id, payload.method, payload.note).await?;
    Ok(api_response::ok(json!({ "message": "Lien he thanh cong" })))
}
