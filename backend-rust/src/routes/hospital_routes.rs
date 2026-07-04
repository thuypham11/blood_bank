use crate::handlers::hospital_handler;
use axum::{
    Router,
    routing::{get, patch, post},
};

use crate::state::AppState;

pub fn hospital_routes() -> Router<AppState> {
    Router::new()
        .route("/blood/needs", get(hospital_handler::public_blood_needs))
        .route("/blood/request", post(hospital_handler::request_blood))
        .route("/blood/requests", get(hospital_handler::get_requests))
        .route(
            "/blood/requests/{id}/confirm",
            patch(hospital_handler::confirm_handover),
        )
        .route("/dashboard", get(hospital_handler::dashboard))
        .route("/blood/stock", get(hospital_handler::stock))
        .route("/blood/stock/history", get(hospital_handler::stock_history))
        .route("/blood/usage", post(hospital_handler::create_usage))
        .route("/history", get(hospital_handler::history))
        .route("/donors", get(hospital_handler::donors))
        .route(
            "/donors/{id}/contact",
            post(hospital_handler::log_contact_attempt),
        )
}
