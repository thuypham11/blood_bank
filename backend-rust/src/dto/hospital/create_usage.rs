use crate::utils::blood::{BloodItem, ComponentItem};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUsageDto {
    pub usage_date: String,
    pub usage_time: String,
    pub patient_name: String,
    pub patient_phone: Option<String>,
    pub relative_name: Option<String>,
    pub relative_phone: Option<String>,
    pub reason: String,
    #[serde(default)]
    pub blood_items: Vec<BloodItem>,
    #[serde(default)]
    pub component_items: Vec<ComponentItem>,
    pub blood_type: Option<String>,
    pub component_type: Option<String>,
    pub units: Option<i64>,
    pub volume_ml: Option<i64>,
}
