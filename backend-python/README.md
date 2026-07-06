# backend_python_bloodlab_clean

Backend Python/FastAPI tập trung cho module Blood Lab, dùng để chạy riêng hoặc làm backend failover thay thế Node.js cho các API Blood Lab.

## Chức năng đã có

- Auth tối thiểu: `/api/auth/login`, `/api/auth/profile`
- Blood Lab dashboard/history/report
- Tiếp nhận túi máu vào kho xét nghiệm
- Cập nhật kết quả sàng lọc
- Nhập túi máu đạt sàng lọc vào kho
- Loại bỏ túi máu không đạt
- Tách chế phẩm máu
- Tra cứu barcode và tạo QR code
- Xem tồn kho, cảnh báo hết hạn, thống kê tồn kho
- Xem/duyệt/từ chối yêu cầu cấp máu từ bệnh viện
- Preview cấp máu và cấp máu cho bệnh viện
- Cập nhật trạng thái bàn giao
- Tìm donor, đánh dấu hiến máu, xem hiến máu gần đây
- Route public phụ: `/api/hospital/blood/needs`

## Chạy trên Windows

```bash
cd backend_python_bloodlab_clean
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Mở `.env`, điền Mongo URI thật và JWT_SECRET giống backend Node.js.

```bash
python -m uvicorn "main:app" --host 127.0.0.1 --port 5000 --reload
```

Test:

```text
http://localhost:5000/health
http://localhost:5000/health/db
http://localhost:5000/docs
```

## Lưu ý quan trọng

- Collection máu chính là `bloods`, tương ứng Mongoose model `Blood` trong Node.js.
- Collection yêu cầu cấp máu là `bloodrequests`.
- JWT_SECRET phải giống backend Node.js để frontend token tương thích.
- Không commit `.env`, `.venv`, `__pycache__`.
