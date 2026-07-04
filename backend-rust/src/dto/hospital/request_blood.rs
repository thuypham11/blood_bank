use crate::utils::blood::{BloodItem, ComponentItem};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestBloodDto {
    pub lab_id: String,
    pub requested_delivery_date: String,
    #[serde(default)]
    pub blood_items: Vec<BloodItem>,
    #[serde(default)]
    pub component_items: Vec<ComponentItem>,
    pub blood_type: Option<String>,
    pub units: Option<i64>,
    pub volume_ml: Option<i64>,
    pub component_type: Option<String>,
}
