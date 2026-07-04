use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ContactAttemptDto {
    pub method: Option<String>,
    pub note: Option<String>,
}
