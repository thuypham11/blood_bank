# Python Integrated Service

Service Python phụ trợ cho hệ thống kho máu.

Chạy service:

```bash
python python-service/integrated_service.py
```

Mặc định chạy tại:

```text
http://127.0.0.1:8001
```

Các API chính:

- `GET /health`
- `POST /lab-results/parse`: đọc CSV kết quả xét nghiệm và chuẩn hóa về JSON.
- `POST /stock/analyze`: phân tích nhanh tồn kho từ danh sách đơn vị máu.

CSV xét nghiệm nên có cột mã mẫu hoặc mã túi và các cột HIV/HBV/HCV/Viêm gan/Giang mai.
