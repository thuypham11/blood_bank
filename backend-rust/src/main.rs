mod app;
mod config;
mod database;
mod dto;
mod errors;
mod handlers;
mod middleware;
mod models;
mod repository;
mod response;
mod routes;
mod services;
mod state;
mod utils;

use crate::{app::build_app, config::env::Config, database::mongodb::connect};
use std::net::SocketAddr;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();

    let config = Config::from_env();
    let database = connect(&config).await?;
    let app = build_app(database, config.clone());
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));

    tracing::info!("BBMS hospital failover backend listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
