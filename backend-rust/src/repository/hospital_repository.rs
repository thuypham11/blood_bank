use crate::errors::app_error::AppError;
use bson::{Bson, DateTime, Document, doc, oid::ObjectId};
use futures_util::TryStreamExt;
use mongodb::{Collection, Database};
use serde_json::{Map, Value, json};

fn collection(db: &Database, name: &str) -> Collection<Document> {
    db.collection::<Document>(name)
}

pub fn bson_to_json(value: Bson) -> Value {
    match value {
        Bson::Double(v) => json!(v),
        Bson::String(v) => json!(v),
        Bson::Array(values) => Value::Array(values.into_iter().map(bson_to_json).collect()),
        Bson::Document(document) => {
            let mut map = Map::new();
            for (key, value) in document {
                map.insert(key, bson_to_json(value));
            }
            Value::Object(map)
        }
        Bson::Boolean(v) => json!(v),
        Bson::Null => Value::Null,
        Bson::Int32(v) => json!(v),
        Bson::Int64(v) => json!(v),
        Bson::ObjectId(id) => json!(id.to_hex()),
        Bson::DateTime(date) => json!(date.to_string()),
        Bson::RegularExpression(regex) => {
            json!({ "$regex": regex.pattern, "$options": regex.options })
        }
        other => json!(other.to_string()),
    }
}

pub fn doc_to_json(document: Document) -> Value {
    bson_to_json(Bson::Document(document))
}

async fn find_many(db: &Database, coll: &str, filter: Document) -> Result<Vec<Document>, AppError> {
    let cursor = collection(db, coll).find(filter).await?;
    Ok(cursor.try_collect::<Vec<Document>>().await?)
}

pub async fn all_blood(db: &Database) -> Result<Vec<Document>, AppError> {
    find_many(db, "bloods", doc! {}).await
}

pub async fn active_blood_requests(db: &Database) -> Result<Vec<Document>, AppError> {
    find_many(
        db,
        "bloodrequests",
        doc! { "status": { "$in": ["pending", "accepted"] } },
    )
    .await
}

pub async fn all_donors(db: &Database, filter: Document) -> Result<Vec<Document>, AppError> {
    find_many(db, "donors", filter).await
}

pub async fn count_donors(db: &Database, filter: Document) -> Result<u64, AppError> {
    Ok(collection(db, "donors").count_documents(filter).await?)
}

pub async fn find_facility_by_id(db: &Database, id: &ObjectId) -> Result<Document, AppError> {
    collection(db, "facilities")
        .find_one(doc! { "_id": id })
        .await?
        .ok_or_else(|| AppError::NotFound("Khong tim thay co so y te nao".to_string()))
}

pub async fn find_approved_lab(db: &Database, id: &ObjectId) -> Result<Document, AppError> {
    collection(db, "facilities")
        .find_one(doc! {
            "_id": id,
            "facilityType": "blood-lab",
            "status": "approved",
        })
        .await?
        .ok_or_else(|| {
            AppError::NotFound("Phong xet nghiem khong tim thay hoac khong chap nhan".to_string())
        })
}

pub async fn push_facility_history(
    db: &Database,
    facility_id: &ObjectId,
    event_type: &str,
    description: String,
    reference_id: Option<ObjectId>,
) -> Result<(), AppError> {
    let mut history = doc! {
        "eventType": event_type,
        "description": description,
        "date": DateTime::now(),
    };
    if let Some(id) = reference_id {
        history.insert("referenceId", id);
    }

    collection(db, "facilities")
        .update_one(
            doc! { "_id": facility_id },
            doc! { "$push": { "history": history } },
        )
        .await?;
    Ok(())
}

pub async fn insert_blood_request(
    db: &Database,
    mut document: Document,
) -> Result<Document, AppError> {
    let now = DateTime::now();
    document.insert("createdAt", now);
    document.insert("updatedAt", now);
    let result = collection(db, "bloodrequests").insert_one(document).await?;
    let id = result
        .inserted_id
        .as_object_id()
        .ok_or(AppError::Internal)?;
    get_blood_request(db, &id).await
}

pub async fn get_blood_request(db: &Database, id: &ObjectId) -> Result<Document, AppError> {
    collection(db, "bloodrequests")
        .find_one(doc! { "_id": id })
        .await?
        .ok_or_else(|| AppError::NotFound("Khong the tim thay yeu cau mau".to_string()))
}

pub async fn hospital_requests(
    db: &Database,
    hospital_id: &ObjectId,
) -> Result<Vec<Document>, AppError> {
    let mut docs = find_many(db, "bloodrequests", doc! { "hospitalId": hospital_id }).await?;
    docs.sort_by_key(|doc| doc.get_datetime("createdAt").ok().cloned());
    docs.reverse();
    Ok(docs)
}

pub async fn hospital_inventory(
    db: &Database,
    hospital_id: &ObjectId,
) -> Result<Vec<Document>, AppError> {
    find_many(db, "bloods", doc! { "hospital": hospital_id }).await
}

pub async fn hospital_history(
    db: &Database,
    hospital_id: &ObjectId,
) -> Result<Vec<Bson>, AppError> {
    let facility = find_facility_by_id(db, hospital_id).await?;
    Ok(facility.get_array("history").cloned().unwrap_or_default())
}

pub async fn cancel_expired_requests(
    db: &Database,
    hospital_id: &ObjectId,
) -> Result<(), AppError> {
    let now = DateTime::now();
    let expired = find_many(
        db,
        "bloodrequests",
        doc! {
            "hospitalId": hospital_id,
            "status": "pending",
            "expiresAt": { "$lte": now },
        },
    )
    .await?;

    for request in expired {
        if let Ok(id) = request.get_object_id("_id") {
            collection(db, "bloodrequests")
                .update_one(
                    doc! { "_id": id },
                    doc! {
                        "$set": {
                            "status": "cancelled",
                            "cancelledAt": now,
                            "cancellationReason": "Da tu dong huy sau 3 ngay khong duoc chap nhan.",
                            "updatedAt": now,
                        },
                        "$push": {
                            "handoverTimeline": {
                                "status": "rejected",
                                "label": "Da tu dong huy sau 3 ngay khong duoc chap nhan.",
                                "date": now,
                                "actor": request.get_object_id("labId").ok(),
                                "note": "Da tu dong huy sau 3 ngay khong duoc chap nhan.",
                            }
                        }
                    },
                )
                .await?;
        }
    }
    Ok(())
}

pub async fn mark_expired_hospital_blood(
    db: &Database,
    hospital_id: &ObjectId,
) -> Result<(), AppError> {
    let now = DateTime::now();
    let expired = find_many(
        db,
        "bloods",
        doc! {
            "hospital": hospital_id,
            "status": { "$ne": "expired" },
            "$or": [
                { "expiryDate": { "$lte": now } },
                { "expirationDate": { "$lte": now } },
            ],
        },
    )
    .await?;

    for stock in expired {
        if let Ok(stock_id) = stock.get_object_id("_id") {
            collection(db, "bloods")
                .update_one(
                    doc! { "_id": stock_id },
                    doc! { "$set": { "status": "expired", "updatedAt": now } },
                )
                .await?;

            let quantity = stock
                .get_i64("quantity")
                .or_else(|_| stock.get_i32("quantity").map(i64::from))
                .unwrap_or(0);
            let label = stock
                .get_str("bloodGroup")
                .or_else(|_| stock.get_str("bloodType"))
                .or_else(|_| stock.get_str("componentType"))
                .unwrap_or("san pham mau");
            push_facility_history(
                db,
                hospital_id,
                "Stock Update",
                format!(
                    "{}ml {} da het han trong kho mau cua benh vien.",
                    quantity, label
                ),
                Some(stock_id),
            )
            .await?;
        }
    }
    Ok(())
}

pub async fn find_available_stock(
    db: &Database,
    hospital_id: &ObjectId,
    filter: Document,
) -> Result<Vec<Document>, AppError> {
    let mut query = doc! {
        "hospital": hospital_id,
        "status": { "$ne": "expired" },
        "quantity": { "$gt": 0 },
    };
    query.extend(filter);
    let mut stock = find_many(db, "bloods", query).await?;
    stock.sort_by_key(|doc| {
        doc.get_datetime("expiryDate")
            .or_else(|_| doc.get_datetime("expirationDate"))
            .ok()
            .cloned()
    });
    Ok(stock)
}

pub async fn update_stock_quantity(
    db: &Database,
    stock_id: &ObjectId,
    quantity: i64,
    status: &str,
) -> Result<(), AppError> {
    collection(db, "bloods")
        .update_one(
            doc! { "_id": stock_id },
            doc! { "$set": { "quantity": quantity, "status": status, "updatedAt": DateTime::now() } },
        )
        .await?;
    Ok(())
}

pub async fn insert_blood_usage(
    db: &Database,
    mut document: Document,
) -> Result<Document, AppError> {
    let now = DateTime::now();
    document.insert("createdAt", now);
    document.insert("updatedAt", now);
    let result = collection(db, "bloodusages").insert_one(document).await?;
    let id = result
        .inserted_id
        .as_object_id()
        .ok_or(AppError::Internal)?;
    collection(db, "bloodusages")
        .find_one(doc! { "_id": id })
        .await?
        .ok_or(AppError::Internal)
}

pub async fn confirm_handover(
    db: &Database,
    request_id: &ObjectId,
    hospital_id: &ObjectId,
) -> Result<Document, AppError> {
    let request = collection(db, "bloodrequests")
        .find_one(doc! { "_id": request_id, "hospitalId": hospital_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Khong the tim thay yeu cau mau".to_string()))?;

    if request.get_str("status").unwrap_or_default() != "accepted"
        || request.get_str("handoverStatus").unwrap_or_default() != "shipping"
    {
        return Err(AppError::BadRequest(
            "Chi co the xac nhan cac don mau dang van chuyen".to_string(),
        ));
    }

    let now = DateTime::now();
    collection(db, "bloodrequests")
        .update_one(
            doc! { "_id": request_id },
            doc! {
                "$set": {
                    "status": "completed",
                    "handoverStatus": "confirmed",
                    "confirmedAt": now,
                    "updatedAt": now,
                },
                "$push": {
                    "handoverTimeline": {
                        "status": "confirmed",
                        "label": "Benh vien ky, xac nhan",
                        "date": now,
                        "actor": hospital_id,
                    }
                }
            },
        )
        .await?;
    get_blood_request(db, request_id).await
}
