use serde::{Deserialize, Serialize};

pub const BLOOD_TYPES: [&str; 8] = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
pub const BLOOD_COMPONENTS: [&str; 3] = ["red_cells", "platelets", "plasma"];
const BLOOD_BAG_VOLUMES: [i64; 3] = [250, 350, 450];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BloodItem {
    pub blood_type: String,
    pub units: i64,
    #[serde(default)]
    pub volume_ml: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentItem {
    pub component_type: String,
    pub units: i64,
    #[serde(default)]
    pub volume_ml: i64,
}

pub fn is_valid_blood_type(value: &str) -> bool {
    BLOOD_TYPES.contains(&value)
}

pub fn is_valid_component(value: &str) -> bool {
    BLOOD_COMPONENTS.contains(&value)
}

pub fn is_valid_volume(value: i64) -> bool {
    if value < BLOOD_BAG_VOLUMES[0] {
        return false;
    }

    let target = value as usize;
    let mut reachable = vec![false; target + 1];
    reachable[0] = true;
    for amount in 1..=target {
        reachable[amount] = BLOOD_BAG_VOLUMES.iter().any(|bag| {
            let bag = *bag as usize;
            amount >= bag && reachable[amount - bag]
        });
    }
    reachable[target]
}

pub fn format_product_items(
    blood_items: &[BloodItem],
    component_items: &[ComponentItem],
) -> String {
    let mut parts = Vec::new();
    parts.extend(
        blood_items
            .iter()
            .map(|item| format!("{}ml mau toan phan {}", item.volume_ml, item.blood_type)),
    );
    parts.extend(component_items.iter().map(|item| {
        let label = match item.component_type.as_str() {
            "red_cells" => "Hong cau",
            "platelets" => "Tieu cau",
            "plasma" => "Huyet tuong",
            other => other,
        };
        format!("{}ml che pham {}", item.volume_ml, label)
    }));
    parts.join(", ")
}
