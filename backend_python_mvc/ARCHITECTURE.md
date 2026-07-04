# Cấu trúc backend Python MVC-style

Bản này tách rõ các lớp để giống backend Node.js/Express gốc hơn.

```text
backend_python/
├── main.py                     # Entry point FastAPI
├── app/
│   ├── routers/                # Khai báo URL/path, giống routes/*.js
│   ├── controllers/            # Xử lý request/response, giống controllers/*.js
│   ├── models/                 # Pydantic model mô tả dữ liệu MongoDB
│   ├── schemas/                # Request/response schema cho API
│   ├── repositories/           # Tầng truy vấn MongoDB dùng chung
│   ├── services/               # Nghiệp vụ dùng lại: CRUD, barcode...
│   ├── middlewares/            # Có thể bổ sung middleware riêng nếu cần
│   ├── core/                   # Config, JWT, password hash
│   ├── db/                     # Kết nối MongoDB
│   └── utils/                  # Helper serialize ObjectId/date
```

## Mapping với backend Node.js gốc

| Node.js/Express gốc | Python/FastAPI mới |
|---|---|
| `routes/*.js` | `app/routers/*.py` |
| `controllers/*.js` | `app/controllers/*_controller.py` |
| `models/*.js` | `app/models/*_model.py` |
| `middlewares/*.js` | `app/deps.py` + có thể thêm `app/middlewares/` |
| `services/*.js` | `app/services/*.py` |
| `config/db.js` | `app/db/mongodb.py` |

## Lưu ý quan trọng

- `routers` bây giờ chỉ đăng ký endpoint và gọi hàm trong `controllers`.
- `controllers` chứa logic xử lý chính của API.
- `models` hiện dùng Pydantic với `extra="allow"` để không làm vỡ dữ liệu MongoDB cũ nếu có field ngoài schema.
- Vì đây là backend phụ dự phòng, ưu tiên lớn nhất là tương thích route và response với frontend hiện tại.
