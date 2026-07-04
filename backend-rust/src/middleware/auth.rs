use crate::{
    errors::app_error::AppError, middleware::jwt::Claims, repository::hospital_repository,
    state::AppState,
};
use axum::{
    extract::{FromRequestParts, State},
    http::{header::AUTHORIZATION, request::Parts},
};
use bson::oid::ObjectId;
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode};

#[derive(Clone, Debug)]
pub struct AuthFacility {
    pub id: ObjectId,
}

impl FromRequestParts<AppState> for AuthFacility {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let State(app_state) = State::<AppState>::from_request_parts(parts, state)
            .await
            .map_err(|_| AppError::Internal)?;

        let header = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .ok_or_else(|| AppError::Unauthorized("Not authorized, no token".to_string()))?;

        let token = header
            .strip_prefix("Bearer ")
            .ok_or_else(|| AppError::Unauthorized("Not authorized, no token".to_string()))?;

        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = true;

        let token = decode::<Claims>(
            token,
            &DecodingKey::from_secret(app_state.jwt_secret().as_bytes()),
            &validation,
        )
        .map_err(|_| AppError::Unauthorized("Khong hop le, loi phan quyen".to_string()))?;

        let id = ObjectId::parse_str(&token.claims.id)
            .map_err(|_| AppError::Unauthorized("Khong hop le, loi phan quyen".to_string()))?;

        let facility = hospital_repository::find_facility_by_id(app_state.db(), &id).await?;
        let facility_type = facility.get_str("facilityType").unwrap_or_default();
        if facility_type != "hospital" {
            return Err(AppError::Forbidden(
                "Chi tac nhan benh vien duoc phep su dung dich vu nay".to_string(),
            ));
        }

        Ok(AuthFacility { id })
    }
}
