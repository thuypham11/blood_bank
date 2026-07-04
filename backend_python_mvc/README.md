# Backend phụ Python cho dự án Blood Bank

## Bản MVC-style

Bản cập nhật này đã tách thêm các thư mục rõ ràng hơn:

```text
app/routers/       # routes: chỉ khai báo endpoint
app/controllers/   # controller: xử lý request/response
app/models/        # model: mô tả dữ liệu MongoDB bằng Pydantic
app/schemas/       # schema request/response
app/repositories/  # lớp truy vấn MongoDB dùng chung
app/services/      # nghiệp vụ tái sử dụng
```

Xem thêm `ARCHITECTURE.md` để biết cách mapping từ backend Node.js sang Python.


Folder này là bản backend phụ viết bằng **Python + FastAPI + MongoDB/Motor**, dựng theo cấu trúc backend Node.js/Express gốc anh gửi.

Mục tiêu chính:

- Giữ gần giống các prefix API hiện có: `/api/auth`, `/api/donor`, `/api/admin`, `/api/facility`, `/api/blood-lab`, `/api/hospital`, `/api/donation-staff`, `/api/lab-staff`, `/api/staff`.
- Dùng chung MongoDB với backend chính để khi backend chính lỗi, reverse proxy có thể chuyển sang backend Python.
- Có `/health` để Nginx/HAProxy kiểm tra sống/chết.

> Lưu ý: bản này là backend phụ tương thích để chạy dự phòng. Một số nghiệp vụ nâng cao ở backend Node.js như OCR, Gemini/OpenRouter, Socket.io room logic, backup `mongodump`, import CSV chi tiết... đã có endpoint tương ứng nhưng đang triển khai ở mức an toàn/tối giản. Khi đưa production, cần test từng luồng frontend và bổ sung logic chuyên sâu nếu frontend phụ thuộc chặt vào response cũ.

## 1. Cấu trúc folder

```text
backend_python/
├── main.py
├── requirements.txt
├── .env.example
├── nginx.backup.example.conf
└── app/
    ├── core/
    │   ├── config.py
    │   └── security.py
    ├── db/
    │   └── mongodb.py
    ├── deps.py
    ├── routers/
    │   ├── auth.py
    │   ├── donor.py
    │   ├── admin.py
    │   ├── facility.py
    │   ├── blood_lab.py
    │   ├── hospital.py
    │   ├── donation_staff.py
    │   ├── lab_staff.py
    │   ├── staff.py
    │   └── camps.py
    ├── services/
    │   ├── crud.py
    │   └── barcode.py
    └── utils/
        └── mongo.py
```

## 2. Cài đặt

```bash
cd backend_python
python -m venv .venv
```

Windows PowerShell:

```bash
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Cài thư viện:

```bash
pip install -r requirements.txt
```

## 3. Tạo file `.env`

```bash
cp .env.example .env
```

Sau đó điền:

```env
MONGO_URI=mongodb+srv://USER:PASSWORD@HOST/Blood-bank?retryWrites=true&w=majority
JWT_SECRET=giống_JWT_SECRET_backend_chính
PORT=8000
FRONTEND_ORIGIN=http://localhost:5173
```

Quan trọng: `JWT_SECRET` nên giống backend chính để token đăng nhập từ backend chính vẫn dùng được khi failover sang backend Python.

## 4. Chạy backend Python

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Kiểm tra:

```bash
curl http://localhost:8000/health
```

Kết quả mong muốn:

```json
{"status":"ok","service":"python-backup-backend"}
```

## 5. Chạy song song với backend chính

Ví dụ:

- Backend chính Node.js: `http://127.0.0.1:5000`
- Backend phụ Python: `http://127.0.0.1:8000`
- Frontend vẫn gọi domain/API cũ qua Nginx.

## 6. Cấu hình Nginx failover mẫu

Xem file `nginx.backup.example.conf`.

Ý tưởng:

```text
Frontend -> Nginx -> Node.js backend chính
                  -> Python backend phụ nếu Node.js lỗi
```

## 7. Những việc cần test trước khi dùng thật

Nên test theo thứ tự:

1. `/health`
2. `/api/auth/login`
3. `/api/auth/profile`
4. Donor dashboard: `/api/donor/profile`, `/api/donor/stats`, `/api/donor/appointments`
5. Admin dashboard: `/api/admin/dashboard`, `/api/admin/donors`, `/api/admin/facilities`
6. Blood lab: `/api/blood-lab/dashboard`, `/api/blood-lab/blood/units`
7. Hospital: `/api/hospital/blood/request`, `/api/hospital/blood/requests`
8. Staff/lab-staff nếu frontend đang dùng.

## 8. Gợi ý triển khai production

- Không commit `.env` lên Git.
- Dùng cùng database nhưng cần kiểm tra kỹ các endpoint ghi dữ liệu để tránh tạo trùng khi request bị retry.
- Dùng Nginx/HAProxy để failover, không nên để frontend tự đổi URL.
- Thêm logging, Sentry/Prometheus nếu chạy thật.
- Với các nghiệp vụ quan trọng như tạo đơn, xác nhận bàn giao máu, import batch, nên bổ sung `idempotency key` để tránh ghi trùng.
