use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Claims {
    pub id: String,
    pub role: Option<String>,
    pub exp: Option<usize>,
}
