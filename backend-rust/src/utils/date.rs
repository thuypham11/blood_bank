use bson::DateTime;
use chrono::{NaiveDate, Utc};

pub fn parse_date(value: &str) -> Option<DateTime> {
    if let Ok(date) = chrono::DateTime::parse_from_rfc3339(value) {
        return Some(DateTime::from_millis(date.timestamp_millis()));
    }

    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .ok()
        .and_then(|date| date.and_hms_opt(0, 0, 0))
        .map(|naive| DateTime::from_millis(naive.and_utc().timestamp_millis()))
}

pub fn start_of_today() -> DateTime {
    let now = Utc::now().date_naive();
    let start = now.and_hms_opt(0, 0, 0).expect("midnight is valid");
    DateTime::from_millis(start.and_utc().timestamp_millis())
}

pub fn now() -> DateTime {
    DateTime::now()
}

pub fn days_from_now(days: i64) -> DateTime {
    DateTime::from_millis(chrono::Utc::now().timestamp_millis() + days * 24 * 60 * 60 * 1000)
}
