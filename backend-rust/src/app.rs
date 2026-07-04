use crate::{config::env::Config, routes::hospital_routes::hospital_routes, state::AppState};
use axum::{Router, routing::get};
use mongodb::Database;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

pub fn build_app(database: Database, config: Config) -> Router {
    let state = AppState::new(database, config);

    Router::new()
        .route("/health", get(|| async { "ok" }))
        .nest("/api/hospital", hospital_routes())
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
