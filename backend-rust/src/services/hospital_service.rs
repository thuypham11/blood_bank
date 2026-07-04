use crate::{
    dto::hospital::{create_usage::CreateUsageDto, request_blood::RequestBloodDto},
    errors::app_error::AppError,
    repository::hospital_repository as repo,
    utils::{
        blood::{self, BloodItem, ComponentItem},
        date, validator,
    },
};
use bson::{Bson, DateTime, Document, doc, oid::ObjectId, to_bson};
use mongodb::Database;
use serde_json::{Value, json};

fn normalize_blood_items(
    mut items: Vec<BloodItem>,
    blood_type: Option<String>,
    units: Option<i64>,
    volume_ml: Option<i64>,
) -> Vec<BloodItem> {
    if items.is_empty() {
        if let Some(blood_type) = blood_type {
            let amount = volume_ml.or(units).unwrap_or(0);
            items.push(BloodItem {
                blood_type,
                units: amount,
                volume_ml: amount,
            });
        }
    }

    items
        .into_iter()
        .filter_map(|mut item| {
            item.blood_type = item.blood_type.trim().to_uppercase();
            if item.volume_ml <= 0 {
                item.volume_ml = item.units;
            }
            item.units = item.volume_ml;
            if blood::is_valid_blood_type(&item.blood_type)
                && blood::is_valid_volume(item.volume_ml)
            {
                Some(item)
            } else {
                None
            }
        })
        .fold(Vec::<BloodItem>::new(), |mut acc, item| {
            if let Some(existing) = acc.iter_mut().find(|v| v.blood_type == item.blood_type) {
                existing.units += item.units;
                existing.volume_ml += item.volume_ml;
            } else {
                acc.push(item);
            }
            acc
        })
}

fn normalize_component_items(
    mut items: Vec<ComponentItem>,
    component_type: Option<String>,
    units: Option<i64>,
    volume_ml: Option<i64>,
) -> Vec<ComponentItem> {
    if items.is_empty() {
        if let Some(component_type) = component_type {
            let amount = volume_ml.or(units).unwrap_or(0);
            items.push(ComponentItem {
                component_type,
                units: amount,
                volume_ml: amount,
            });
        }
    }

    items
        .into_iter()
        .filter_map(|mut item| {
            item.component_type = item.component_type.trim().to_string();
            if item.volume_ml <= 0 {
                item.volume_ml = item.units;
            }
            item.units = item.volume_ml;
            if blood::is_valid_component(&item.component_type)
                && blood::is_valid_volume(item.volume_ml)
            {
                Some(item)
            } else {
                None
            }
        })
        .fold(Vec::<ComponentItem>::new(), |mut acc, item| {
            if let Some(existing) = acc
                .iter_mut()
                .find(|v| v.component_type == item.component_type)
            {
                existing.units += item.units;
                existing.volume_ml += item.volume_ml;
            } else {
                acc.push(item);
            }
            acc
        })
}

fn items_to_bson<T: serde::Serialize>(items: &[T]) -> Result<Bson, AppError> {
    to_bson(items)
        .map_err(|_| AppError::BadRequest("Du lieu san pham mau khong hop le".to_string()))
}

fn quantity(doc: &Document) -> i64 {
    doc.get_i64("quantity")
        .or_else(|_| doc.get_i32("quantity").map(i64::from))
        .unwrap_or(0)
}

pub async fn request_blood(
    db: &Database,
    hospital_id: &ObjectId,
    dto: RequestBloodDto,
) -> Result<Value, AppError> {
    let lab_id = ObjectId::parse_str(&dto.lab_id)
        .map_err(|_| AppError::BadRequest("Ma phong thi nghiem khong hop le".to_string()))?;
    let blood_items =
        normalize_blood_items(dto.blood_items, dto.blood_type, dto.units, dto.volume_ml);
    let component_items = normalize_component_items(
        dto.component_items,
        dto.component_type,
        dto.units,
        dto.volume_ml,
    );

    if blood_items.is_empty() && component_items.is_empty() {
        return Err(AppError::BadRequest(
            "Vui long cung cap ma so phong thi nghiem va it nhat mot mau mau hop le.".to_string(),
        ));
    }
    validator::validate_product_counts(blood_items.len(), component_items.len())?;

    let delivery_date = date::parse_date(&dto.requested_delivery_date)
        .ok_or_else(|| AppError::BadRequest("Ngay van chuyen den khong hop le".to_string()))?;
    if delivery_date < date::start_of_today() {
        return Err(AppError::BadRequest(
            "Ngay van chuyen den phai la ngay hom nay hoac ngay sau do".to_string(),
        ));
    }

    let lab = repo::find_approved_lab(db, &lab_id).await?;
    let total_units = blood_items
        .iter()
        .map(|item| item.units)
        .chain(component_items.iter().map(|item| item.units))
        .sum::<i64>();
    let product_names = blood_items
        .iter()
        .map(|item| item.blood_type.clone())
        .chain(
            component_items
                .iter()
                .map(|item| item.component_type.clone()),
        )
        .collect::<Vec<_>>()
        .join(", ");

    let request = repo::insert_blood_request(
        db,
        doc! {
            "hospitalId": hospital_id,
            "labId": lab_id,
            "bloodType": product_names,
            "units": total_units,
            "bloodItems": items_to_bson(&blood_items)?,
            "componentItems": items_to_bson(&component_items)?,
            "status": "pending",
            "handoverStatus": "requested",
            "handoverTimeline": [{
                "status": "requested",
                "label": "Benh vien gui yeu cau",
                "date": DateTime::now(),
                "actor": hospital_id,
            }],
            "requestedDeliveryDate": delivery_date,
            "expiresAt": date::days_from_now(3),
        },
    )
    .await?;

    let request_id = request.get_object_id("_id").ok();
    let lab_name = lab.get_str("name").unwrap_or("phong xet nghiem");
    repo::push_facility_history(
        db,
        hospital_id,
        "Stock Update",
        format!(
            "Da yeu cau {} tu {}",
            blood::format_product_items(&blood_items, &component_items),
            lab_name
        ),
        request_id,
    )
    .await?;

    Ok(repo::doc_to_json(request))
}

pub async fn get_requests(db: &Database, hospital_id: &ObjectId) -> Result<Value, AppError> {
    repo::cancel_expired_requests(db, hospital_id).await?;
    let requests = repo::hospital_requests(db, hospital_id)
        .await?
        .into_iter()
        .map(repo::doc_to_json)
        .collect::<Vec<_>>();
    Ok(json!({ "data": requests }))
}

pub async fn dashboard(db: &Database, hospital_id: &ObjectId) -> Result<Value, AppError> {
    let inventory_docs = repo::hospital_inventory(db, hospital_id).await?;
    let requests_docs = repo::hospital_requests(db, hospital_id).await?;
    let hospital = repo::find_facility_by_id(db, hospital_id).await?;
    let total_units = inventory_docs.iter().map(quantity).sum::<i64>();
    let pending_requests = requests_docs
        .iter()
        .filter(|request| request.get_str("status").unwrap_or_default() == "pending")
        .count();

    Ok(json!({
        "stats": {
            "totalUnits": total_units,
            "pendingRequests": pending_requests,
            "totalRequests": requests_docs.len(),
        },
        "inventory": inventory_docs.into_iter().map(repo::doc_to_json).collect::<Vec<_>>(),
        "recentRequests": requests_docs.into_iter().take(5).map(repo::doc_to_json).collect::<Vec<_>>(),
        "hospital": repo::doc_to_json(hospital),
    }))
}

pub async fn stock(db: &Database, hospital_id: &ObjectId) -> Result<Value, AppError> {
    repo::mark_expired_hospital_blood(db, hospital_id).await?;
    let stock = repo::hospital_inventory(db, hospital_id)
        .await?
        .into_iter()
        .map(repo::doc_to_json)
        .collect::<Vec<_>>();
    Ok(json!({ "data": stock }))
}

async fn consume_stock_line(
    db: &Database,
    hospital_id: &ObjectId,
    filter: Document,
    label: String,
    required: i64,
) -> Result<(), AppError> {
    let stock = repo::find_available_stock(db, hospital_id, filter).await?;
    let available = stock.iter().map(quantity).sum::<i64>();
    if available < required {
        return Err(AppError::BadRequest(format!(
            "Khong du {} trong kho. Hien co: {}ml, yeu cau: {}ml.",
            label, available, required
        )));
    }

    let mut remaining = required;
    for item in stock {
        if remaining <= 0 {
            break;
        }
        let stock_id = item.get_object_id("_id").map_err(|_| AppError::Internal)?;
        let current = quantity(&item);
        let used = current.min(remaining);
        let next_quantity = current - used;
        remaining -= used;
        let status = if next_quantity == 0 {
            "used"
        } else {
            item.get_str("status").unwrap_or("available")
        };
        repo::update_stock_quantity(db, stock_id, next_quantity, status).await?;
    }
    Ok(())
}

pub async fn create_usage(
    db: &Database,
    hospital_id: &ObjectId,
    dto: CreateUsageDto,
) -> Result<Value, AppError> {
    let blood_items =
        normalize_blood_items(dto.blood_items, dto.blood_type, dto.units, dto.volume_ml);
    let component_items = normalize_component_items(
        dto.component_items,
        dto.component_type,
        dto.units,
        dto.volume_ml,
    );
    let total_units = blood_items
        .iter()
        .map(|item| item.units)
        .chain(component_items.iter().map(|item| item.units))
        .sum::<i64>();

    if dto.usage_date.is_empty()
        || dto.usage_time.is_empty()
        || dto.patient_name.is_empty()
        || dto.reason.is_empty()
        || total_units <= 0
        || (blood_items.is_empty() && component_items.is_empty())
    {
        return Err(AppError::BadRequest(
            "Vui long cung cap han su dung, thoi gian, ten benh nhan, nhom mau, don vi va ly do"
                .to_string(),
        ));
    }

    validator::validate_product_counts(blood_items.len(), component_items.len())?;
    repo::mark_expired_hospital_blood(db, hospital_id).await?;

    for item in &blood_items {
        consume_stock_line(
            db,
            hospital_id,
            doc! { "productType": "whole_blood", "bloodGroup": &item.blood_type },
            format!("mau toan phan {}", item.blood_type),
            item.volume_ml,
        )
        .await?;
    }
    for item in &component_items {
        consume_stock_line(
            db,
            hospital_id,
            doc! { "productType": "blood_component", "componentType": &item.component_type },
            format!("che pham {}", item.component_type),
            item.volume_ml,
        )
        .await?;
    }

    let usage_date = date::parse_date(&dto.usage_date)
        .ok_or_else(|| AppError::BadRequest("Ngay su dung khong hop le".to_string()))?;
    let usage = repo::insert_blood_usage(
        db,
        doc! {
            "hospital": hospital_id,
            "usageDate": usage_date,
            "usageTime": dto.usage_time,
            "patientName": &dto.patient_name,
            "patientPhone": dto.patient_phone,
            "relativeName": dto.relative_name,
            "relativePhone": dto.relative_phone,
            "bloodItems": items_to_bson(&blood_items)?,
            "componentItems": items_to_bson(&component_items)?,
            "units": total_units,
            "reason": &dto.reason,
        },
    )
    .await?;

    let summary = blood::format_product_items(&blood_items, &component_items);
    repo::push_facility_history(
        db,
        hospital_id,
        "Stock Update",
        format!(
            "Da su dung {} de truyen cho benh nhan {}. Ly do: {}",
            summary, dto.patient_name, dto.reason
        ),
        usage.get_object_id("_id").ok(),
    )
    .await?;

    Ok(repo::doc_to_json(usage))
}

pub async fn stock_history(db: &Database, hospital_id: &ObjectId) -> Result<Value, AppError> {
    repo::mark_expired_hospital_blood(db, hospital_id).await?;
    let mut history = repo::hospital_history(db, hospital_id)
        .await?
        .into_iter()
        .filter_map(|item| match item {
            Bson::Document(doc)
                if doc.get_str("eventType").unwrap_or_default() == "Stock Update" =>
            {
                Some(repo::doc_to_json(doc))
            }
            _ => None,
        })
        .collect::<Vec<_>>();
    history.reverse();
    Ok(json!({ "history": history }))
}

pub async fn history(db: &Database, hospital_id: &ObjectId) -> Result<Value, AppError> {
    let mut history = repo::hospital_history(db, hospital_id)
        .await?
        .into_iter()
        .map(repo::bson_to_json)
        .collect::<Vec<_>>();
    history.reverse();
    Ok(json!({ "history": history }))
}

pub async fn confirm_handover(
    db: &Database,
    hospital_id: &ObjectId,
    request_id: &str,
) -> Result<Value, AppError> {
    let request_id = ObjectId::parse_str(request_id)
        .map_err(|_| AppError::BadRequest("Ma yeu cau mau khong hop le".to_string()))?;
    let request = repo::confirm_handover(db, &request_id, hospital_id).await?;

    repo::push_facility_history(
        db,
        hospital_id,
        "Stock Update",
        "Da xac nhan nhan mau tu phong xet nghiem.".to_string(),
        Some(request_id),
    )
    .await?;

    Ok(repo::doc_to_json(request))
}

fn request_items(request: &Document) -> Vec<(String, i64)> {
    if let Ok(items) = request.get_array("bloodItems") {
        let parsed = items
            .iter()
            .filter_map(|item| match item {
                Bson::Document(doc) => Some((
                    doc.get_str("bloodType").ok()?.to_string(),
                    doc.get_i64("units")
                        .or_else(|_| doc.get_i32("units").map(i64::from))
                        .unwrap_or(0),
                )),
                _ => None,
            })
            .collect::<Vec<_>>();
        if !parsed.is_empty() {
            return parsed;
        }
    }

    match (
        request.get_str("bloodType"),
        request
            .get_i64("units")
            .or_else(|_| request.get_i32("units").map(i64::from)),
    ) {
        (Ok(blood_type), Ok(units)) => vec![(blood_type.to_string(), units)],
        _ => Vec::new(),
    }
}

pub async fn public_blood_needs(db: &Database) -> Result<Value, AppError> {
    let stock = repo::all_blood(db).await?;
    let requests = repo::active_blood_requests(db).await?;
    let donors = repo::all_donors(db, doc! {}).await?;

    let mut stock_by_type = std::collections::HashMap::<String, i64>::new();
    let mut request_by_type = std::collections::HashMap::<String, i64>::new();
    let mut donor_by_type = std::collections::HashMap::<String, i64>::new();
    for blood_type in blood::BLOOD_TYPES {
        stock_by_type.insert(blood_type.to_string(), 0);
        request_by_type.insert(blood_type.to_string(), 0);
        donor_by_type.insert(blood_type.to_string(), 0);
    }

    for item in stock {
        let blood_type = item
            .get_str("bloodGroup")
            .or_else(|_| item.get_str("bloodType"))
            .unwrap_or_default();
        let expiry_ok = item
            .get_datetime("expiryDate")
            .or_else(|_| item.get_datetime("expirationDate"))
            .map(|date| *date > DateTime::now())
            .unwrap_or(true);
        if blood::is_valid_blood_type(blood_type) && expiry_ok {
            *stock_by_type.entry(blood_type.to_string()).or_default() += quantity(&item);
        }
    }

    for request in requests {
        for (blood_type, units) in request_items(&request) {
            if blood::is_valid_blood_type(&blood_type) {
                *request_by_type.entry(blood_type).or_default() += units;
            }
        }
    }

    for donor in &donors {
        if let Ok(blood_group) = donor.get_str("bloodGroup") {
            if blood::is_valid_blood_type(blood_group) {
                *donor_by_type.entry(blood_group.to_string()).or_default() += 1;
            }
        }
    }

    let total_donors = donors.len() as i64;
    let data = blood::BLOOD_TYPES
        .iter()
        .map(|blood_type| {
            let available = *stock_by_type.get(*blood_type).unwrap_or(&0);
            let requested = *request_by_type.get(*blood_type).unwrap_or(&0);
            let shortage = requested - available;
            let need = if shortage > 10 || (requested > 0 && available < 5) {
                "Rat khan cap"
            } else if shortage > 0 || available < 10 {
                "Cao"
            } else if available < 25 || requested > 0 {
                "Trung binh"
            } else {
                "Thap"
            };
            let donor_count = *donor_by_type.get(*blood_type).unwrap_or(&0);
            let donor_percent = if total_donors > 0 {
                ((donor_count as f64 / total_donors as f64) * 100.0).round() as i64
            } else {
                0
            };
            json!({
                "type": blood_type,
                "need": need,
                "donors": format!("{}%", donor_percent),
                "availableUnits": available,
                "requestedUnits": requested,
            })
        })
        .collect::<Vec<_>>();

    Ok(json!({ "data": data }))
}

pub async fn donors(
    db: &Database,
    query: crate::dto::hospital::dashboard::DonorQuery,
) -> Result<Value, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(20).clamp(1, 100);
    let mut filter = doc! {};

    if let Some(search) = query.search.filter(|value| !value.is_empty()) {
        filter.insert(
            "$or",
            vec![
                doc! { "fullName": { "$regex": &search, "$options": "i" } },
                doc! { "email": { "$regex": &search, "$options": "i" } },
                doc! { "phone": { "$regex": &search, "$options": "i" } },
                doc! { "address.city": { "$regex": &search, "$options": "i" } },
            ],
        );
    }
    if let Some(blood_group) = query.blood_group.filter(|value| value != "all") {
        filter.insert("bloodGroup", blood_group);
    }
    if let Some(city) = query.city.filter(|value| value != "all") {
        filter.insert("address.city", doc! { "$regex": city, "$options": "i" });
    }

    let total = repo::count_donors(db, filter.clone()).await?;
    let mut donors = repo::all_donors(db, filter).await?;
    donors.sort_by(|a, b| {
        let a_name = a.get_str("fullName").unwrap_or_default();
        let b_name = b.get_str("fullName").unwrap_or_default();
        a_name.cmp(b_name)
    });
    let start = ((page - 1) * limit) as usize;
    let page_donors = donors
        .into_iter()
        .skip(start)
        .take(limit as usize)
        .map(repo::doc_to_json)
        .collect::<Vec<_>>();

    Ok(json!({
        "donors": page_donors,
        "recommendedDonors": [],
        "neededBloodTypes": [],
        "pagination": {
            "total": total,
            "currentPage": page,
            "totalPages": total.div_ceil(limit),
            "hasNext": page * limit < total,
            "hasPrev": page > 1,
        },
        "stats": {
            "total": total,
            "available": total,
            "rareBlood": 0,
            "recommended": 0,
        }
    }))
}

pub async fn log_contact(
    db: &Database,
    hospital_id: &ObjectId,
    donor_id: &str,
    method: Option<String>,
    note: Option<String>,
) -> Result<(), AppError> {
    let donor_id = ObjectId::parse_str(donor_id)
        .map_err(|_| AppError::BadRequest("Ma nguoi hien mau khong hop le".to_string()))?;
    let donor = repo::all_donors(db, doc! { "_id": donor_id })
        .await?
        .into_iter()
        .next()
        .ok_or_else(|| AppError::NotFound("Khong tim thay nguoi hien mau".to_string()))?;
    let name = donor.get_str("fullName").unwrap_or("nguoi hien mau");
    let group = donor.get_str("bloodGroup").unwrap_or("");
    repo::push_facility_history(
        db,
        hospital_id,
        "Contact",
        format!("Da lien he voi nguoi hien mau {} ({}).", name, group),
        Some(donor_id),
    )
    .await?;

    let contact = doc! {
        "contactedBy": hospital_id,
        "contactDate": DateTime::now(),
        "contactType": "hospital",
        "method": method.unwrap_or_else(|| "phone".to_string()),
        "note": note.unwrap_or_default(),
    };
    db.collection::<Document>("donors")
        .update_one(
            doc! { "_id": donor_id },
            doc! { "$push": { "contactHistory": contact } },
        )
        .await?;
    Ok(())
}
