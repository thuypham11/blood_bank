#[derive(Clone, Debug)]
pub struct Config {
    pub mongo_uri: String,
    pub mongo_db: String,
    pub jwt_secret: String,
    pub port: u16,
}

impl Config {
    pub fn from_env() -> Self {
        let mongo_uri = std::env::var("MONGO_URI")
            .unwrap_or_else(|_| "mongodb://localhost:27017/bloodbank".to_string());
        let mongo_db = std::env::var("MONGO_DB").unwrap_or_else(|_| infer_db_name(&mongo_uri));
        let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "changeme".to_string());
        let port = std::env::var("RUST_PORT")
            .or_else(|_| std::env::var("PORT"))
            .ok()
            .and_then(|value| value.parse::<u16>().ok())
            .unwrap_or(5001);

        Self {
            mongo_uri,
            mongo_db,
            jwt_secret,
            port,
        }
    }
}

fn infer_db_name(uri: &str) -> String {
    let without_query = uri.split('?').next().unwrap_or(uri);
    without_query
        .rsplit('/')
        .next()
        .filter(|name| !name.is_empty() && !name.contains(':'))
        .unwrap_or("bloodbank")
        .to_string()
}
