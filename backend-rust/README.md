# BBMS Hospital Rust Failover Backend

Rust service du phong cho tac nhan `hospital`, dung chung MongoDB va JWT voi backend Node.js hien tai.

## Chay local

```powershell
cd backend-rust
$env:MONGO_URI="mongodb://localhost:27017/<database>"
$env:JWT_SECRET="<same-secret-as-node-backend>"
$env:RUST_PORT="5001"
cargo run
```

Service expose cac route tuong thich:

- `GET /health`
- `GET /api/hospital/blood/needs`
- `POST /api/hospital/blood/request`
- `GET /api/hospital/blood/requests`
- `PATCH /api/hospital/blood/requests/{id}/confirm`
- `GET /api/hospital/dashboard`
- `GET /api/hospital/blood/stock`
- `GET /api/hospital/blood/stock/history`
- `POST /api/hospital/blood/usage`
- `GET /api/hospital/history`
- `GET /api/hospital/donors`
- `POST /api/hospital/donors/{id}/contact`

Tat ca route rieng cua hospital su dung header `Authorization: Bearer <facility-token>` va chi chap nhan facility co `facilityType = "hospital"`.
