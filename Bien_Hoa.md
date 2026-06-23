# Đánh giá nghiệp vụ dự án Blood Bank

Tài liệu này tổng hợp các thiếu sót nghiệp vụ được nhận thấy trong dự án hiện tại và thứ tự đề xuất hoàn thiện trước khi xây dựng báo cáo chính thức.

## 1. Có hai nguồn dữ liệu đơn vị máu

Dự án đang sử dụng đồng thời:

- `backend/models/BloodModel.js`
- `backend/models/BloodUnit.js`

Blood Lab chủ yếu sử dụng `BloodModel`, trong khi một số luồng của nhân viên hiến máu và xét nghiệm lại sử dụng `BloodUnit`. Vì vậy, một túi máu được nhân viên tạo có thể không xuất hiện trong kho Blood Lab.

### Đề xuất

Hợp nhất thành một model đơn vị máu duy nhất và sử dụng model đó cho toàn bộ quy trình:

- Tiếp nhận hiến máu.
- Xét nghiệm.
- Tách chế phẩm.
- Quản lý kho.
- Xuất máu.
- Bàn giao cho bệnh viện.
- Báo cáo.

## 2. Trạng thái đơn vị máu chưa thống nhất

Dự án đang tồn tại nhiều trạng thái có ý nghĩa tương tự:

- `pending_screening`
- `pending_testing`
- `pending-testing`
- `quarantine`
- `qualified`
- `passed`
- `failed`
- `available`
- `discarded`

### Đề xuất vòng đời thống nhất

```text
COLLECTED
→ RECEIVED
→ QUARANTINE
→ SCREENING
→ QUALIFIED / REJECTED
→ COMPONENT_PROCESSED
→ AVAILABLE
→ RESERVED
→ ISSUED
→ CONFIRMED / USED
→ EXPIRED / DISCARDED
```

Mỗi trạng thái cần xác định:

- Vai trò nào được phép chuyển trạng thái.
- Trạng thái nguồn và trạng thái đích hợp lệ.
- Điều kiện để chuyển trạng thái.
- Thời gian và người thực hiện.
- Lý do khi từ chối, loại bỏ hoặc thay đổi bất thường.

## 3. Đơn vị tính chưa thống nhất

Yêu cầu máu đang sử dụng số `units`, chức năng xuất kho sử dụng `ml`, trong khi một số lịch sử hiến máu lưu `quantity = 1`.

Điều này có thể làm sai:

- Báo cáo tồn kho.
- Số lượng yêu cầu.
- Tổng lượng máu đã nhận.
- Tổng lượng máu đã xuất.
- Đối chiếu giữa kho và bệnh viện.

### Đề xuất

Tách rõ hai trường:

```js
unitCount: 2
volumeMl: 700
```

Cần quy định rõ một đơn vị máu có dung tích thực tế bao nhiêu và báo cáo nào sử dụng số túi, báo cáo nào sử dụng ml.

## 4. Yêu cầu máu chưa liên kết với các túi máu thực tế

Khi Blood Lab chấp nhận một yêu cầu, hệ thống hiện chủ yếu thay đổi trạng thái yêu cầu. Chưa có bước giữ chỗ các túi máu cụ thể.

Chức năng xuất máu cũng đang nhận tên bệnh viện dạng chuỗi và chưa liên kết trực tiếp với `requestId`.

### Quy trình đề xuất

```text
Bệnh viện gửi yêu cầu
→ Blood Lab kiểm tra tồn kho
→ Chấp nhận hoặc từ chối
→ Giữ chỗ các túi máu cụ thể
→ Chuyển các túi sang RESERVED
→ Chuẩn bị và đóng gói
→ Xuất kho
→ Bệnh viện xác nhận
→ Hoàn tất yêu cầu
```

Mỗi yêu cầu nên lưu:

- `hospitalId`
- `labId`
- `bloodUnitIds`
- Nhóm máu.
- Loại chế phẩm.
- Số túi.
- Tổng dung tích.
- Mức độ ưu tiên.
- Lý do yêu cầu.
- Trạng thái bàn giao.

## 5. Có nguy cơ xuất cùng một túi máu nhiều lần

Chức năng xuất kho hiện tìm danh sách túi phù hợp trước, sau đó mới cập nhật trạng thái bằng `updateMany`.

Nếu hai nhân viên thao tác cùng thời điểm, cả hai có thể cùng chọn một túi trước khi trạng thái được cập nhật.

### Đề xuất

- Thêm trạng thái `RESERVED`.
- Giữ chỗ túi máu bằng thao tác nguyên tử.
- Kiểm tra lại trạng thái trước khi xác nhận xuất.
- Sử dụng transaction khi cập nhật nhiều túi.
- Hủy giữ chỗ khi yêu cầu bị hủy hoặc hết thời gian xử lý.
- Không cho phép xuất túi đã hết hạn hoặc đã được giữ cho yêu cầu khác.

## 6. Xác thực chưa kiểm tra đúng vai trò nghiệp vụ

Middleware Facility hiện chủ yếu kiểm tra người dùng có phải một Facility hợp lệ hay không. Nó chưa phân biệt đầy đủ:

- Blood Lab.
- Hospital.
- Donation Staff.

Điều này có thể cho phép một loại cơ sở gọi API dành cho loại cơ sở khác.

### Đề xuất

Xây dựng middleware riêng:

```text
requireBloodLab
requireHospital
requireDonationStaff
requireAdmin
```

Ví dụ:

- Chỉ Blood Lab được cập nhật xét nghiệm và tách chế phẩm.
- Chỉ bệnh viện được tạo yêu cầu và xác nhận nhận máu.
- Chỉ nhân viên hiến máu được hoàn thành lượt hiến.
- Chỉ người có quyền phù hợp được tiêu hủy hoặc thu hồi máu.

## 7. Quy trình sàng lọc đang bị chia đôi

Dự án đang có hai bộ trường xét nghiệm khác nhau.

Bộ thứ nhất:

- `hiv`
- `hbv`
- `hcv`
- `hepatitis`
- `syphilis`

Bộ thứ hai:

- `hiv`
- `hepatitisB`
- `hepatitisC`
- `syphilis`
- `malaria`

Một số luồng có thể kết luận đạt dựa trên payload chưa đầy đủ.

### Đề xuất

Xây dựng một schema sàng lọc thống nhất, bao gồm:

- Kết quả từng chỉ tiêu.
- Trạng thái tổng thể.
- Ngày lấy mẫu.
- Ngày xét nghiệm.
- Người thực hiện.
- Người phê duyệt.
- Mã mẫu xét nghiệm.
- Lần xét nghiệm.
- Ghi chú.
- Lý do kiểm tra lại.
- Lịch sử thay đổi kết quả.

Không nên xóa kết quả cũ. Nếu sửa kết quả, phải lưu cả giá trị trước và sau.

## 8. Quản lý chế phẩm còn thiếu thông tin bảo quản

Chức năng barcode và ParentID đã hỗ trợ truy vết túi gốc, nhưng chế phẩm vẫn cần thêm các thông tin nghiệp vụ:

- Loại chế phẩm.
- Ngày giờ tách.
- Người thực hiện.
- Dung tích thực tế.
- Mã thiết bị hoặc quy trình xử lý.
- Vị trí kho, tủ và ngăn.
- Điều kiện bảo quản.
- Hạn sử dụng.
- Tình trạng bao bì.
- Lý do hao hụt.
- Lý do hủy.

Hạn sử dụng và điều kiện bảo quản phải được cấu hình theo quy định chuyên môn được đơn vị y tế phê duyệt, không nên đặt tùy ý trong mã nguồn.

## 9. Thiếu quy trình hết hạn, thu hồi và tiêu hủy

Dự án cần bổ sung:

- Tự động phát hiện đơn vị máu hết hạn.
- Chuyển trạng thái sang `EXPIRED`.
- Cảnh báo sắp hết hạn.
- Danh sách chờ tiêu hủy.
- Lý do tiêu hủy.
- Người đề xuất.
- Người xác nhận.
- Ngày giờ tiêu hủy.
- Biên bản tiêu hủy.
- Chức năng thu hồi khi phát hiện vấn đề sau khi đã xuất.
- Danh sách bệnh viện đã nhận chế phẩm liên quan.
- Truy vết từ người hiến đến bệnh viện nhận máu.

## 10. Quản lý điều kiện hiến máu còn đơn giản

Model người hiến hiện có khoảng cách hiến máu cố định và trường boolean `eligibleToDonate`.

Cách này chưa thể hiện đầy đủ các trường hợp:

- Tạm hoãn trong một khoảng thời gian.
- Tạm hoãn đến khi có kết quả kiểm tra.
- Không đủ điều kiện vĩnh viễn.
- Được bác sĩ hoặc người có thẩm quyền cho phép lại.

### Đề xuất hồ sơ tạm hoãn

```text
Lý do
Loại tạm hoãn
Ngày bắt đầu
Ngày kết thúc dự kiến
Ngày được phép hiến lại
Người đưa ra kết luận
Ghi chú
Trạng thái hiện tại
```

Ngoài ra cần lưu:

- Sự đồng ý của người hiến.
- Phiên bản phiếu khai báo sức khỏe.
- Thời gian ký xác nhận.
- Lịch sử thay đổi điều kiện hiến.

Các quy tắc đủ điều kiện phải được cấu hình theo chính sách chuyên môn đã được phê duyệt.

## 11. Audit log chưa bao phủ toàn bộ nghiệp vụ

Dự án đã có `AuditLogModel`, nhưng nhiều thao tác Blood Lab hiện chỉ ghi mô tả dạng chuỗi vào `Facility.history`.

### Các thao tác cần audit đầy đủ

- Tiếp nhận túi máu.
- Thay đổi barcode.
- Cập nhật xét nghiệm.
- Phê duyệt kết quả.
- Tách chế phẩm.
- Nhập kho.
- Giữ chỗ.
- Xuất kho.
- Bàn giao.
- Thu hồi.
- Hủy hoặc tiêu hủy.
- Sửa thông tin người hiến.
- Thay đổi trạng thái yêu cầu.

Mỗi audit log nên chứa:

- Người thực hiện.
- Vai trò.
- Thời gian.
- IP hoặc thiết bị nếu cần.
- Đối tượng bị thay đổi.
- Giá trị trước.
- Giá trị sau.
- Lý do thay đổi.
- Yêu cầu hoặc đơn vị máu liên quan.

Audit log không nên cho phép sửa hoặc xóa thông thường.

## 12. Danh sách bệnh viện đang được khai báo cố định trên frontend

Danh sách bệnh viện trong giao diện Blood Stock hiện là dữ liệu khai báo sẵn.

### Đề xuất

Tạo API lấy danh sách Facility với điều kiện:

```text
facilityType = hospital
status = approved
```

Khi xuất máu phải lưu `hospitalId`, không chỉ lưu tên bệnh viện. Tên bệnh viện chỉ dùng để hiển thị.

## 13. Quy trình barcode trong toàn hệ thống chưa hoàn toàn thống nhất

Kho Blood Lab đã có bộ sinh mã mới theo cấu trúc:

```text
BBU-{MÃ_CƠ_SỞ}-{NĂM}-{SỐ_TĂNG_DẦN}
```

Tuy nhiên, một số controller cũ vẫn tạo barcode bằng timestamp hoặc số ngẫu nhiên.

### Đề xuất

- Tất cả luồng tạo đơn vị máu phải dùng chung một barcode service.
- Barcode chỉ chứa ID.
- Không chứa nhóm máu hoặc thông tin người hiến.
- Không cho sửa barcode sau khi đã phát hành.
- Mỗi đơn vị lưu trữ có một barcode riêng.
- Mỗi chế phẩm có barcode riêng.
- Chế phẩm lưu `parentUnit` và `parentBarcode`.
- Quét barcode để lấy ID rồi truy vấn database.
- Không dùng dữ liệu chứa trực tiếp trong mã làm nguồn quyết định nghiệp vụ.

## 14. Thiếu quản lý vị trí kho và điều kiện bảo quản

Hiện dữ liệu chưa thể hiện rõ:

- Kho nào.
- Tủ lạnh hoặc tủ đông nào.
- Ngăn nào.
- Vị trí cụ thể.
- Lịch sử chuyển vị trí.
- Nhiệt độ yêu cầu.
- Lịch sử nhiệt độ thực tế.
- Sự cố mất điện hoặc vượt ngưỡng.
- Người xử lý sự cố.

Đây là dữ liệu quan trọng để quyết định đơn vị máu có còn được phép sử dụng hay không.

## 15. Thiếu quy trình kiểm kê kho

Nên bổ sung:

- Tạo phiên kiểm kê.
- Quét barcode từng đơn vị.
- So sánh dữ liệu thực tế với hệ thống.
- Ghi nhận thiếu, thừa hoặc sai vị trí.
- Khóa phiên kiểm kê.
- Người kiểm kê và người phê duyệt.
- Báo cáo chênh lệch.

## 16. Thiếu cảnh báo và thông báo nghiệp vụ

Nên có cảnh báo cho:

- Tồn kho thấp theo nhóm máu và chế phẩm.
- Đơn vị máu sắp hết hạn.
- Kết quả xét nghiệm đang chờ quá lâu.
- Yêu cầu bệnh viện chưa xử lý.
- Đơn hàng đang vận chuyển chưa được xác nhận.
- Túi máu đang được giữ chỗ quá thời gian.
- Đơn vị cần thu hồi.
- Thiết bị bảo quản gặp sự cố.

## 17. Thiếu liên kết xuyên suốt từ người hiến đến bệnh viện

Một chuỗi truy vết hoàn chỉnh nên là:

```text
Người hiến
→ Lượt hẹn
→ Lượt hiến
→ Túi máu toàn phần
→ Kết quả sàng lọc
→ Các chế phẩm
→ Vị trí kho
→ Yêu cầu máu
→ Phiếu xuất kho
→ Bệnh viện nhận
→ Xác nhận sử dụng hoặc hoàn trả
```

Hệ thống hiện có nhiều phần của chuỗi này nhưng chúng chưa sử dụng chung một nguồn dữ liệu và chưa liên kết đầy đủ.

## 18. Báo cáo có nguy cơ sai số liệu

Nếu xây dựng báo cáo trước khi chuẩn hóa dữ liệu, có thể xảy ra:

- Một túi máu xuất hiện trong model này nhưng không có trong model khác.
- Trạng thái tương tự bị tính thành nhiều nhóm.
- `units` bị cộng chung với `ml`.
- Túi gốc đã tách vẫn bị tính cùng các chế phẩm.
- Dữ liệu đã xuất vẫn bị tính là tồn kho.
- Bệnh viện nhận máu chỉ được lưu bằng tên nên khó đối chiếu.

### Các báo cáo nên có sau khi chuẩn hóa

- Tồn kho theo nhóm máu.
- Tồn kho theo chế phẩm.
- Tổng số túi và tổng dung tích.
- Máu đang chờ xét nghiệm.
- Máu đạt và không đạt.
- Máu sắp hết hạn.
- Máu đã hết hạn.
- Máu đã xuất theo bệnh viện.
- Tỷ lệ hủy.
- Tỷ lệ tách chế phẩm.
- Thời gian xử lý trung bình.
- Yêu cầu bệnh viện theo trạng thái.
- Lịch sử truy vết của từng barcode.

## Thứ tự ưu tiên hoàn thiện

### Giai đoạn 1: Chuẩn hóa nền tảng

1. Hợp nhất `BloodModel` và `BloodUnit`.
2. Chuẩn hóa trạng thái.
3. Chuẩn hóa đơn vị tính.
4. Thống nhất barcode service.
5. Thêm phân quyền theo vai trò.

### Giai đoạn 2: Hoàn thiện quy trình cốt lõi

1. Liên kết lượt hiến với túi máu.
2. Chuẩn hóa xét nghiệm.
3. Hoàn thiện tách chế phẩm.
4. Thêm vị trí và điều kiện bảo quản.
5. Liên kết yêu cầu với từng túi máu.
6. Thêm giữ chỗ và xuất kho nguyên tử.
7. Hoàn thiện bàn giao bệnh viện.

### Giai đoạn 3: Kiểm soát và an toàn

1. Audit log đầy đủ.
2. Hết hạn và tiêu hủy.
3. Thu hồi.
4. Kiểm kê.
5. Cảnh báo.
6. Quản lý tạm hoãn người hiến.

### Giai đoạn 4: Báo cáo và tích hợp Python

1. Xây dựng các báo cáo nghiệp vụ.
2. Kiểm tra và đối chiếu số liệu.
3. Tích hợp Python để phân tích tồn kho hoặc dự báo nhu cầu.
4. Không để Python tự quyết định nghiệp vụ y tế.
5. Python chỉ nên cung cấp kết quả phân tích hoặc gợi ý.

## Kết luận

Dự án đã có phần lớn các màn hình và chức năng nền tảng cần thiết. Thiếu sót lớn nhất không nằm ở giao diện mà nằm ở việc dữ liệu và quy trình chưa được thống nhất xuyên suốt.

Bốn việc cần ưu tiên trước khi hoàn thiện báo cáo là:

1. Hợp nhất model đơn vị máu.
2. Chuẩn hóa trạng thái và đơn vị tính.
3. Liên kết yêu cầu bệnh viện với các túi máu thực tế.
4. Phân quyền và audit đầy đủ.

Nếu chưa giải quyết các điểm này, báo cáo có thể hiển thị đẹp nhưng số liệu chưa đủ đáng tin cậy.

