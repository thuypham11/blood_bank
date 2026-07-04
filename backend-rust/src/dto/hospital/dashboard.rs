use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DonorQuery {
    pub search: Option<String>,
    pub blood_group: Option<String>,
    pub city: Option<String>,
    pub availability: Option<String>,
    pub sort_by: Option<String>,
    pub page: Option<u64>,
    pub limit: Option<u64>,
}
