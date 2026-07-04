use crate::config::env::Config;
use mongodb::Database;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    inner: Arc<AppStateInner>,
}

pub struct AppStateInner {
    pub db: Database,
    pub config: Config,
}

impl AppState {
    pub fn new(db: Database, config: Config) -> Self {
        Self {
            inner: Arc::new(AppStateInner { db, config }),
        }
    }

    pub fn db(&self) -> &Database {
        &self.inner.db
    }

    pub fn jwt_secret(&self) -> &str {
        &self.inner.config.jwt_secret
    }
}
