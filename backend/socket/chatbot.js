// backend/socket/chatbot.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Khởi tạo Gemini AI (nếu dùng)
const genAI = process.env.GOOGLE_API_KEY 
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  : null;

// Knowledge Base - Câu hỏi thường gặp về hiến máu
const FAQ_DATABASE = {
  // Điều kiện hiến máu
  "điều kiện hiến máu|ai có thể hiến máu|tiêu chuẩn hiến máu": {
    answer: `📋 **Điều kiện hiến máu cơ bản:**

✅ **Độ tuổi**: 18 - 60 tuổi
✅ **Cân nặng**: ≥ 45kg
✅ **Sức khỏe**: Không mắc bệnh mãn tính, không đang điều trị
✅ **Huyết áp**: Huyết áp ổn định (90-140/60-90)
✅ **Hemoglobin**: Nam ≥ 130g/L, Nữ ≥ 120g/L
✅ **Không sử dụng**: Rượu bia trước 24h, thuốc lá trước 2h

❌ **Không nên hiến khi**:
- Đang sốt, cảm cúm
- Đang mang thai hoặc cho con bú
- Có hành vi nguy cơ lây nhiễm HIV
- Đang điều trị bằng kháng sinh`,
    category: "eligibility"
  },

  // Tần suất hiến máu
  "bao lâu được hiến|tần suất hiến máu|hiến máu mấy tháng 1 lần": {
    answer: `⏰ **Tần suất hiến máu an toàn:**

👨 **Nam giới**: Mỗi 3 tháng (tối đa 4 lần/năm)
👩 **Nữ giới**: Mỗi 4 tháng (tối đa 3 lần/năm)

📊 **Khuyến nghị**:
- Sau mỗi lần hiến, cơ thể cần 90-120 ngày để phục hồi hoàn toàn
- Nên hiến định kỳ để duy trì nguồn máu ổn định
- Không nên hiến quá 4 lần/năm để bảo vệ sức khỏe`,
    category: "frequency"
  },

  // Lợi ích hiến máu
  "lợi ích hiến máu|hiến máu có lợi gì|tác dụng hiến máu": {
    answer: `💪 **Lợi ích của việc hiến máu:**

🌟 **Cho người nhận**: Cứu sống bệnh nhân (tai nạn, phẫu thuật, ung thư, tan máu bẩm sinh...)

🌟 **Cho người hiến**:
- Được kiểm tra sức khỏe miễn phí
- Giảm nguy cơ mắc bệnh tim mạch
- Kích thích cơ thể sản sinh tế bào máu mới
- Phát hiện sớm các bệnh truyền nhiễm (nếu có)
- Tạo cảm giác tích cực, giảm căng thẳng

🌟 **Cho cộng đồng**:
- Đảm bảo nguồn máu dự trữ cho cấp cứu
- Lan tỏa tinh thần nhân ái`,
    category: "benefits"
  },

  // Chuẩn bị trước khi hiến
  "chuẩn bị trước khi hiến|cần làm gì trước khi hiến|lưu ý trước khi hiến": {
    answer: `📝 **Hướng dẫn chuẩn bị trước khi hiến máu:**

✅ **Nên làm**:
- Ăn nhẹ trước 2-3 giờ (cháo, bánh mì, sữa)
- Uống nhiều nước (nước lọc, nước trái cây)
- Ngủ đủ giấc (ít nhất 6 tiếng)
- Mang theo CMND/CCCD

❌ **Không nên làm**:
- Hiến máu khi đói
- Sử dụng rượu bia trước 24 giờ
- Hút thuốc lá trước 2 giờ
- Uống cà phê trước khi hiến

📌 **Lưu ý**: Nếu đang dùng thuốc, hãy thông báo với nhân viên y tế.`,
    category: "preparation"
  },

  // Sau khi hiến máu
  "sau khi hiến máu|chăm sóc sau hiến|làm gì sau khi hiến": {
    answer: `🍎 **Chăm sóc sau khi hiến máu:**

✅ **Ngay sau hiến**:
- Nghỉ ngơi tại chỗ 10-15 phút
- Uống nước hoặc nước trái cây
- Không lái xe hoặc vận động mạnh trong 2 giờ

✅ **Trong 24 giờ**:
- Uống nhiều nước
- Ăn đủ bữa, bổ sung sắt (thịt đỏ, rau xanh)
- Không mang vác nặng
- Bỏ băng sau 4-6 giờ

✅ **Trong tuần**:
- Theo dõi sức khỏe, nghỉ ngơi hợp lý
- Báo ngay nếu có dấu hiệu bất thường (chóng mặt, mệt mỏi kéo dài)`,
    category: "aftercare"
  },

  // Địa điểm hiến máu
  "hiến máu ở đâu|địa điểm hiến máu|chỗ hiến máu": {
    answer: `🏥 **Nơi có thể hiến máu:**

📌 **Bệnh viện lớn**:
- Bệnh viện Bạch Mai (Hà Nội)
- Bệnh viện Chợ Rẫy (TP.HCM)
- Bệnh viện Trung ương Huế

📌 **Trung tâm Truyền máu**:
- Viện Huyết học - Truyền máu TW
- Trung tâm Truyền máu TP.HCM

📌 **Điểm hiến máu lưu động**:
Xem lịch tại website hoặc fanpage của chúng tôi

💻 **Đặt lịch online**: Truy cập mục "Đăng ký hiến máu" trên hệ thống.`,
    category: "location"
  },

  // Các nhóm máu
  "các nhóm máu|loại máu|nhóm máu nào": {
    answer: `🩸 **Các nhóm máu và tỷ lệ dân số Việt Nam:**

| Nhóm máu | Tỷ lệ | Đặc điểm |
|----------|-------|----------|
| **O+** | 42% | Phổ biến nhất, có thể cho tất cả Rh+ |
| **A+** | 25% | Phổ biến |
| **B+** | 20% | Phổ biến |
| **O-** | 5% | Máu hiếm, có thể cho tất cả |
| **AB+** | 4% | Nhóm máu hiếm |
| **A-** | 2% | Nhóm máu hiếm |
| **B-** | 1.5% | Nhóm máu hiếm |
| **AB-** | 0.5% | Nhóm máu hiếm nhất |

⚠️ Nhóm O- là nhóm máu chuyên cho, AB+ là nhóm máu chuyên nhận.`,
    category: "blood_types"
  },

  // Thực phẩm nên ăn
  "nên ăn gì trước khi hiến|ăn gì để tăng máu|thực phẩm bổ máu": {
    answer: `🥩 **Thực phẩm giàu sắt và vitamin:**

🟢 **Trước khi hiến (2-3 giờ)**:
- Cháo, bánh mì, ngũ cốc
- Sữa, sữa chua
- Trái cây tươi (chuối, cam)

🟢 **Sau khi hiến**:
- Thịt đỏ (bò, heo, dê)
- Gan, trứng, cá
- Rau xanh đậm (cải bó xôi, cải xoăn)
- Các loại đậu, hạt
- Trái cây giàu vitamin C (cam, quýt, bưởi)

🚫 **Hạn chế**: Cà phê, trà đặc, nước ngọt có ga`,
    category: "nutrition"
  },

  // Không đủ điều kiện
  "không đủ điều kiện|bị từ chối hiến máu|lý do không được hiến": {
    answer: `⚠️ **Các trường hợp tạm thời không thể hiến máu:**

🔴 **Tạm thời hoãn (1-12 tháng)**:
- Mới xăm hình, xỏ khuyên (12 tháng)
- Mới phẫu thuật (6-12 tháng)
- Đang dùng kháng sinh (2 tuần sau khi khỏi)
- Mới tiêm vắc-xin (4 tuần)
- Phụ nữ có thai hoặc cho con bú

🔴 **Vĩnh viễn không được hiến**:
- Có bệnh truyền nhiễm mãn tính (HIV, Viêm gan B/C)
- Mắc bệnh ung thư
- Bệnh tim mạch nặng

📞 Nếu không chắc chắn, hãy hỏi ý kiến bác sĩ trước khi đến hiến.`,
    category: "deferral"
  },

  // Số lượng máu hiến
  "hiến bao nhiêu máu|lượng máu hiến|ml máu": {
    answer: `💉 **Lượng máu hiến an toàn:**

📊 **Mỗi lần hiến**:
- **350 ml** - Người có cân nặng từ 45-55kg
- **450 ml** - Người có cân nặng trên 55kg

🔬 **Thông tin thêm**:
- Cơ thể người trung bình có 4-5 lít máu
- Lượng máu hiến chỉ chiếm 7-10% tổng lượng máu
- Cơ thể phục hồi lượng máu đã hiến sau 24-48 giờ
- Hồng cầu phục hồi sau 4-6 tuần

✅ **An toàn tuyệt đối**: Mọi dụng cụ đều vô trùng, dùng 1 lần.`,
    category: "volume"
  },

  // Help / Hỗ trợ
  "help|hỗ trợ|trợ giúp": {
    answer: `🤖 **Tôi có thể giúp bạn các vấn đề sau:**

📌 **Thông tin cơ bản**:
- Điều kiện hiến máu
- Tần suất hiến máu
- Lợi ích khi hiến máu

📌 **Hướng dẫn**:
- Chuẩn bị trước khi hiến
- Chăm sóc sau khi hiến
- Thực phẩm nên ăn

📌 **Khác**:
- Các nhóm máu
- Địa điểm hiến máu
- Lý do bị từ chối

💬 Hãy gõ từ khóa bạn quan tâm! (VD: "điều kiện hiến máu")`,
    category: "help"
  }
};

// Hàm tìm câu trả lời từ FAQ
function findAnswerFromFAQ(userMessage) {
  const normalizedMessage = userMessage.toLowerCase().trim();
  
  for (const [patterns, data] of Object.entries(FAQ_DATABASE)) {
    const patternList = patterns.split("|");
    for (const pattern of patternList) {
      if (normalizedMessage.includes(pattern)) {
        return {
          answer: data.answer,
          category: data.category,
          source: "faq"
        };
      }
    }
  }
  return null;
}

// Hàm gọi Gemini AI để trả lời (nếu không có trong FAQ)
async function getAIResponse(userMessage, conversationHistory = []) {
  if (!genAI) {
    return "Xin lỗi, hiện tại tôi chưa thể trả lời câu hỏi này. Vui lòng thử lại sau hoặc liên hệ hotline: 1900 6868";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const systemPrompt = `Bạn là trợ lý ảo "BloodBot" của hệ thống Ngân hàng Máu Việt Nam.
Nhiệm vụ: Tư vấn về hiến máu, sức khỏe, và các vấn đề liên quan.

QUY TẮC:
1. CHỈ trả lời các câu hỏi liên quan đến hiến máu, sức khỏe, ngân hàng máu, y tế
2. Nếu câu hỏi không liên quan, từ chối lịch sự và nhắc lại phạm vi hỗ trợ
3. Luôn nhấn mạnh tính an toàn và khuyến khích tham khảo ý kiến bác sĩ
4. Trả lời bằng tiếng Việt, thân thiện, dễ hiểu
5. Không đưa ra chẩn đoán y khoa

PHẠM VI HỖ TRỢ:
- Điều kiện, quy trình hiến máu
- Lợi ích và rủi ro
- Chăm sóc trước/sau hiến
- Kiến thức về máu và nhóm máu
- Thông tin về các điểm hiến máu

Hãy trả lời câu hỏi sau: ${userMessage}`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau! 🙏";
  }
}

// Xử lý tin nhắn chính
export async function processMessage(message, conversationHistory = []) {
  // 1. Tìm trong FAQ trước
  const faqResult = findAnswerFromFAQ(message);
  if (faqResult) {
    return {
      text: faqResult.answer,
      type: "faq",
      category: faqResult.category
    };
  }

  // 2. Nếu không có, gọi AI
  const aiResponse = await getAIResponse(message, conversationHistory);
  return {
    text: aiResponse,
    type: "ai",
    category: "general"
  };
}