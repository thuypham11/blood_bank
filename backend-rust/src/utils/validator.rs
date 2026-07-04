use crate::{errors::app_error::AppError, utils::blood};

pub fn validate_product_counts(blood_count: usize, component_count: usize) -> Result<(), AppError> {
    if blood_count > blood::BLOOD_TYPES.len() || component_count > blood::BLOOD_COMPONENTS.len() {
        return Err(AppError::BadRequest(
            "Qua nhieu yeu cau trong cung 1 luc".to_string(),
        ));
    }
    Ok(())
}
