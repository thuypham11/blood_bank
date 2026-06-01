// backend/socket/index.js
import { Server } from "socket.io";
import { getOpenRouterResponse } from "../services/openrouterService.js";

let io;

export function initSocketServer(server) {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("🟢 Client connected:", socket.id);

    let conversationHistory = []; 

// backend/socket/index.js (phần send_message)
socket.on("send_message", async (data) => {
  console.log(`📨 Message from ${socket.id}:`, data.message);
  
  // Lấy donorId từ token (đã được lưu trong socket handshake)
  const donorId = socket.donorId; // Cần set khi kết nối
  
  socket.emit("ai_thinking", { isThinking: true });
  
  try {
    // Gọi BloodBot Pro với donor context
    const aiResponse = await getOpenRouterResponse(data.message, conversationHistory, donorId);
    
    conversationHistory.push(
      { role: "user", parts: [{ text: data.message }] },
      { role: "model", parts: [{ text: aiResponse }] }
    );
    
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }
    
    socket.emit("receive_message", {
      text: aiResponse,
      type: "bot",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ BloodBot error:", error);
    socket.emit("receive_message", {
      text: "Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau! 🙏",
      type: "error",
      timestamp: new Date().toISOString()
    });
  } finally {
    socket.emit("ai_thinking", { isThinking: false });
  }
});
    socket.on("disconnect", () => {
      console.log("🔴 Client disconnected:", socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

// 🆕 Hàm xử lý tin nhắn về hiến máu
async function processBloodBankMessage(message, history) {
  const lowerMsg = message.toLowerCase().trim();
  
  // ============ KNOWLEDGE BASE ============
  
  // 1. Điều kiện hiến máu
  if (lowerMsg.includes("điều kiện") || lowerMsg.includes("tiêu chuẩn") || lowerMsg.includes("ai có thể hiến")) {
    return `📋 **Điều kiện hiến máu cơ bản:**

✅ **Độ tuổi**: 18 - 60 tuổi
✅ **Cân nặng**: ≥ 45kg
✅ **Sức khỏe**: Không mắc bệnh mãn tính, không đang điều trị
✅ **Huyết áp**: Ổn định (90-140/60-90)
✅ **Hemoglobin**: Nam ≥ 130g/L, Nữ ≥ 120g/L

❌ **Không nên hiến khi**:
- Đang sốt, cảm cúm
- Đang mang thai hoặc cho con bú
- Có hành vi nguy cơ lây nhiễm HIV
- Đang điều trị bằng kháng sinh

💉 **Lượng máu hiến**: 250ml - 450ml tùy cân nặng`;
  }

  // 2. Tần suất hiến máu
  if (lowerMsg.includes("bao lâu") || lowerMsg.includes("tần suất") || lowerMsg.includes("mấy tháng")) {
    return `⏰ **Tần suất hiến máu an toàn:**

👨 **Nam giới**: Mỗi 3 tháng (tối đa 4 lần/năm)
👩 **Nữ giới**: Mỗi 4 tháng (tối đa 3 lần/năm)

📊 **Khuyến nghị**:
- Sau mỗi lần hiến, cơ thể cần 90-120 ngày để phục hồi
- Nên hiến định kỳ để duy trì nguồn máu ổn định
- Không nên hiến quá 4 lần/năm để bảo vệ sức khỏe

💪 Hãy theo dõi lịch hiến của bạn trong mục "Lịch sử hiến máu" nhé!`;
  }

  // 3. Lợi ích hiến máu
  if (lowerMsg.includes("lợi ích") || lowerMsg.includes("tác dụng") || lowerMsg.includes("có lợi gì")) {
    return `💪 **Lợi ích của việc hiến máu:**

🌟 **Cho người nhận**: Cứu sống bệnh nhân (tai nạn, phẫu thuật, ung thư, tan máu bẩm sinh...)

🌟 **Cho người hiến**:
- Được kiểm tra sức khỏe miễn phí (huyết áp, nhịp tim, hemoglobin)
- Giảm nguy cơ mắc bệnh tim mạch
- Kích thích cơ thể sản sinh tế bào máu mới
- Phát hiện sớm các bệnh truyền nhiễm (nếu có)
- Tạo cảm giác tích cực, giảm căng thẳng

🌟 **Cho cộng đồng**:
- Đảm bảo nguồn máu dự trữ cho cấp cứu
- Lan tỏa tinh thần nhân ái

"Một giọt máu cho đi - Một cuộc đời ở lại" ❤️`;
  }

  // 4. Chuẩn bị trước khi hiến
  if (lowerMsg.includes("chuẩn bị") || lowerMsg.includes("cần làm gì") || lowerMsg.includes("lưu ý")) {
    return `📝 **Hướng dẫn chuẩn bị trước khi hiến máu:**

✅ **Nên làm**:
- Ăn nhẹ trước 2-3 giờ (cháo, bánh mì, sữa, trái cây)
- Uống nhiều nước (nước lọc, nước trái cây)
- Ngủ đủ giấc (ít nhất 6 tiếng)
- Mang theo CMND/CCCD

❌ **Không nên làm**:
- Hiến máu khi đói
- Sử dụng rượu bia trước 24 giờ
- Hút thuốc lá trước 2 giờ
- Uống cà phê trước khi hiến

📌 **Lưu ý**: Nếu đang dùng thuốc, hãy thông báo với nhân viên y tế.

🩸 Hãy đến với tâm thế thoải mái và sức khỏe tốt nhất nhé!`;
  }

  // 5. Sau khi hiến máu
  if (lowerMsg.includes("sau khi hiến") || lowerMsg.includes("chăm sóc") || lowerMsg.includes("sau hiến")) {
    return `🍎 **Chăm sóc sau khi hiến máu:**

✅ **Ngay sau hiến**:
- Nghỉ ngơi tại chỗ 10-15 phút
- Uống nước hoặc nước trái cây
- Ăn nhẹ (bánh, kẹo, sữa)
- Không lái xe hoặc vận động mạnh trong 2 giờ

✅ **Trong 24 giờ**:
- Uống nhiều nước
- Ăn đủ bữa, bổ sung sắt (thịt đỏ, gan, rau xanh, đậu)
- Không mang vác nặng
- Bỏ băng sau 4-6 giờ
- Không tập thể dục nặng

✅ **Trong tuần**:
- Theo dõi sức khỏe
- Bổ sung thực phẩm giàu sắt
- Báo ngay nếu có dấu hiệu bất thường (chóng mặt, mệt mỏi kéo dài)

📞 Hotline hỗ trợ: 1900 6868 nếu cần tư vấn thêm!`;
  }

  // 6. Địa điểm hiến máu
  if (lowerMsg.includes("địa điểm") || lowerMsg.includes("ở đâu") || lowerMsg.includes("chỗ nào") || lowerMsg.includes("điểm hiến")) {
    return `🏥 **Nơi có thể hiến máu:**

📌 **Bệnh viện lớn**:
- Bệnh viện Bạch Mai (Hà Nội) - 78 Giải Phóng
- Bệnh viện Chợ Rẫy (TP.HCM) - 201B Nguyễn Chí Thanh
- Bệnh viện Trung ương Huế - 16 Lê Lợi, Huế

📌 **Trung tâm Truyền máu**:
- Viện Huyết học - Truyền máu TW (Hà Nội)
- Trung tâm Truyền máu Chợ Rẫy (TP.HCM)
- Trung tâm Truyền máu Đà Nẵng

📌 **Điểm hiến máu lưu động**:
Xem lịch cụ thể trong mục "Điểm Hiến Máu" trên hệ thống

💻 **Đặt lịch online**: Truy cập mục "Đăng ký hiến máu" để chọn điểm và thời gian phù hợp!`;
  }

  // 7. Các nhóm máu
  if (lowerMsg.includes("nhóm máu") || lowerMsg.includes("loại máu") || lowerMsg.includes("rh")) {
    return `🩸 **Các nhóm máu và tỷ lệ dân số Việt Nam:**

| Nhóm máu | Tỷ lệ | Cho | Nhận |
|----------|-------|-----|------|
| **O+** | 42% | O+, A+, B+, AB+ | O+, O- |
| **A+** | 25% | A+, AB+ | A+, A-, O+, O- |
| **B+** | 20% | B+, AB+ | B+, B-, O+, O- |
| **AB+** | 4% | AB+ | Tất cả |
| **O-** | 5% | Tất cả | O- |
| **A-** | 2% | A-, A+, AB-, AB+ | A-, O- |
| **B-** | 1.5% | B-, B+, AB-, AB+ | B-, O- |
| **AB-** | 0.5% | AB-, AB+ | AB-, A-, B-, O- |

⚠️ **Ghi chú**:
- Nhóm O- là "máu vàng" - có thể cho tất cả
- Nhóm AB+ là nhóm "chuyên nhận" - có thể nhận từ tất cả
- Nhóm máu hiếm cần được quản lý đặc biệt

💪 Hãy biết nhóm máu của mình để có thể hỗ trợ kịp thời khi cần!`;
  }

  // 8. Thực phẩm nên ăn
  if (lowerMsg.includes("ăn gì") || lowerMsg.includes("thực phẩm") || lowerMsg.includes("bổ máu")) {
    return `🥩 **Thực phẩm giàu sắt và vitamin cho người hiến máu:**

🟢 **Trước khi hiến (2-3 giờ)**:
- Cháo, bánh mì, ngũ cốc
- Sữa, sữa chua
- Trái cây tươi (chuối, cam, táo)

🟢 **Sau khi hiến (bổ sung sắt)**:
- **Thịt đỏ**: Bò, heo, dê, cừu
- **Nội tạng**: Gan, tim, thận
- **Hải sản**: Cá, tôm, cua, hàu, sò
- **Trứng**: Đặc biệt là lòng đỏ
- **Rau xanh đậm**: Cải bó xôi, cải xoăn, bông cải xanh
- **Các loại đậu**: Đậu nành, đậu lăng, đậu xanh
- **Trái cây giàu vitamin C**: Cam, quýt, bưởi, kiwi, ổi (giúp hấp thu sắt tốt hơn)
- **Các loại hạt**: Hạt điều, hạt bí, hạt hướng dương

🚫 **Hạn chế**:
- Cà phê, trà đặc (uống sau ăn 1-2 giờ)
- Nước ngọt có ga
- Đồ ăn nhanh, nhiều dầu mỡ

💚 Ăn uống lành mạnh giúp cơ thể nhanh phục hồi và sẵn sàng cho lần hiến tiếp theo!`;
  }

  // 9. Không đủ điều kiện (từ chối)
  if (lowerMsg.includes("không đủ điều kiện") || lowerMsg.includes("bị từ chối") || lowerMsg.includes("lý do")) {
    return `⚠️ **Các trường hợp tạm thời hoặc vĩnh viễn không thể hiến máu:**

🔴 **Tạm thời hoãn (1-12 tháng)**:
- Mới xăm hình, xỏ khuyên, xăm môi (12 tháng)
- Mới phẫu thuật lớn (6-12 tháng)
- Mới nhổ răng (7 ngày)
- Đang dùng kháng sinh (2 tuần sau khi khỏi)
- Mới tiêm vắc-xin (4 tuần)
- Phụ nữ có thai hoặc đang cho con bú
- Mới sốt, cảm cúm (2 tuần sau khi khỏi)

🔴 **Vĩnh viễn không được hiến**:
- Có bệnh truyền nhiễm mãn tính (HIV, Viêm gan B/C, Giang mai)
- Mắc bệnh ung thư
- Bệnh tim mạch nặng
- Bệnh lao
- Nghiện ma túy

📞 **Không chắc chắn?** Hãy gọi hotline 1900 6868 để được tư vấn cụ thể trước khi đến hiến máu.

💙 Sức khỏe của bạn là quan trọng nhất! Nếu chưa đủ điều kiện, hãy chăm sóc sức khỏe và quay lại sau nhé!`;
  }

  // 10. Lượng máu hiến
  if (lowerMsg.includes("bao nhiêu") || lowerMsg.includes("lượng máu") || lowerMsg.includes("ml")) {
    return `💉 **Lượng máu hiến an toàn:**

📊 **Mỗi lần hiến**:
- **250 ml** - Người có cân nặng từ 45-50kg
- **350 ml** - Người có cân nặng từ 50-55kg
- **450 ml** - Người có cân nặng trên 55kg

🔬 **Thông tin thêm**:
- Cơ thể người trung bình có 4-5 lít máu
- Lượng máu hiến chỉ chiếm 7-10% tổng lượng máu
- Cơ thể phục hồi lượng nước trong máu sau 24-48 giờ
- Hồng cầu phục hồi sau 4-6 tuần
- Lượng sắt dự trữ phục hồi sau 8-12 tuần

✅ **An toàn tuyệt đối**: Mọi dụng cụ đều vô trùng, dùng một lần, không có nguy cơ lây nhiễm.

🩸 Hãy yên tâm, lượng máu hiến hoàn toàn an toàn cho sức khỏe!`;
  }

  // 11. Help
  if (lowerMsg.includes("help") || lowerMsg.includes("hỗ trợ") || lowerMsg.includes("trợ giúp")) {
    return `🤖 **BloodBot có thể giúp bạn các vấn đề sau:**

📌 **Thông tin cơ bản**:
🔹 Điều kiện hiến máu
🔹 Tần suất hiến máu
🔹 Lợi ích khi hiến máu

📌 **Hướng dẫn**:
🔹 Chuẩn bị trước khi hiến
🔹 Chăm sóc sau khi hiến
🔹 Thực phẩm nên ăn

📌 **Kiến thức y khoa**:
🔹 Các nhóm máu
🔹 Lượng máu hiến an toàn
🔹 Các trường hợp không thể hiến

📌 **Dịch vụ**:
🔹 Địa điểm hiến máu
🔹 Đặt lịch online

💬 **Hãy gõ câu hỏi của bạn**, tôi sẽ trả lời ngay!

📞 Hoặc gọi hotline: 1900 6868 để được hỗ trợ trực tiếp.`;
  }

  // 12. Cảm ơn
  if (lowerMsg.includes("cảm ơn") || lowerMsg.includes("thanks") || lowerMsg.includes("thank")) {
    return `❤️ **Không có gì!** Rất vui được giúp bạn.

Bạn có thể:
- 📋 Xem các điểm hiến máu gần nhất
- 📅 Đặt lịch hiến máu ngay hôm nay
- 📞 Gọi hotline 1900 6868 nếu cần hỗ trợ

>> **Một giọt máu cho đi - Một cuộc đời ở lại** <<

Cảm ơn bạn đã quan tâm đến hiến máu cứu người! 💪`;
  }

  // 13. Chào hỏi
  if (lowerMsg.includes("xin chào") || lowerMsg.includes("chào") || lowerMsg.includes("hi") || lowerMsg.includes("hello")) {
    return `👋 **Xin chào!** Rất vui được gặp bạn!

Tôi là **BloodBot** - trợ lý ảo của **Ngân hàng Máu Việt Nam**.

Bạn cần tôi tư vấn về:
• 📋 Điều kiện hiến máu
• ⏰ Tần suất hiến máu
• 💪 Lợi ích khi hiến máu
• 📝 Chuẩn bị trước khi hiến
• 🍎 Chăm sóc sau khi hiến
• 🩸 Các nhóm máu
• 🏥 Địa điểm hiến máu

Hãy hỏi tôi bất cứ điều gì bạn muốn biết nhé! 💬`;
  }

  // Default response - khi không hiểu câu hỏi
  return `🤔 **Xin lỗi, tôi chưa hiểu rõ câu hỏi của bạn.**

Bạn có thể hỏi tôi về:
🔹 "Điều kiện hiến máu là gì?"
🔹 "Bao lâu được hiến máu một lần?"
🔹 "Hiến máu có lợi gì?"
🔹 "Cần chuẩn bị gì trước khi hiến?"
🔹 "Địa điểm hiến máu ở đâu?"
🔹 "Các nhóm máu"
🔹 "Sau khi hiến cần làm gì?"

💡 **Mẹo**: Hãy hỏi cụ thể và rõ ràng để tôi có thể giúp bạn tốt hơn!

📞 Hoặc gọi hotline 1900 6868 để được tư vấn trực tiếp.`;
}