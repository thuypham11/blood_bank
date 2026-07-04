use crate::config::env::Config;
use mongodb::{Client, Database};

pub async fn connect(config: &Config) -> mongodb::error::Result<Database> {
    let client = Client::with_uri_str(&config.mongo_uri).await?;
    Ok(client.database(&config.mongo_db))
}
