// backend/services/openrouterService.js
import OpenAI from 'openai';
import Donor from '../models/donorModel.js';
import BloodCamp from '../models/bloodCampModel.js';

let openrouter = null;
function getClient() {
  if (!openrouter) {
    openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY || "placeholder",
      baseURL: "https://openrouter.ai/api/v1",
    });
  }
  return openrouter;
}

// Danh sách model thử nghiệm (ưu tiên model tốt nhất)
const MODEL_LIST = [
  "openrouter/auto",
  "openrouter/cas:free",
  "microsoft/phi-3-mini-128k-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free"
];

// Hệ thống kiến thức chuyên sâu về hiến máu (fallback khi AI lỗi)
const KNOWLEDGE_BASE = {
  // Điều kiện hiến máu
  "điều kiện|tiêu chuẩn|ai có thể": "✅ **Điều kiện hiến máu cơ bản:**\n• 18-60 tuổi\n• Cân nặng ≥45kg\n• Không mắc bệnh mãn tính\n• Huyết áp ổn định\n• Không sử dụng rượu bia 24h trước khi hiến",
  
  // Tần suất
  "bao lâu|tần suất|mấy tháng": "⏰ **Tần suất hiến máu an toàn:**\n• Nam: 3 tháng/lần (tối đa 4 lần/năm)\n• Nữ: 4 tháng/lần (tối đa 3 lần/năm)",
  
  // Lợi ích
  "lợi ích|tác dụng|có lợi gì": "💪 **Lợi ích hiến máu:**\n• Cứu sống bệnh nhân\n• Được kiểm tra sức khỏe miễn phí\n• Giảm nguy cơ tim mạch\n• Kích thích tạo tế bào máu mới",
  
  // Chuẩn bị
  "chuẩn bị|cần làm gì|lưu ý": "📝 **Chuẩn bị trước khi hiến:**\n• Ăn nhẹ trước 2-3 giờ\n• Uống nhiều nước\n• Ngủ đủ 6 tiếng\n• Mang CCCD/CMND",
  
  // Sau hiến
  "sau khi hiến|chăm sóc|sau hiến": "🍎 **Sau hiến máu:**\n• Nghỉ ngơi 10-15 phút\n• Uống nước, ăn nhẹ\n• Không vận động mạnh 2 giờ\n• Bỏ băng sau 4-6 giờ",
  
  // Nhóm máu
  "nhóm máu|loại máu|rh": "🩸 **Các nhóm máu phổ biến ở Việt Nam:**\n• O+: 42% (phổ biến nhất)\n• A+: 25%\n• B+: 20%\n• O-: 5% (máu vàng)\n• AB-: 0.5% (hiếm nhất)",
  
  // Thực phẩm
  "ăn gì|thực phẩm|bổ máu": "🥩 **Thực phẩm giàu sắt:**\n• Thịt đỏ, gan\n• Rau xanh đậm (cải bó xôi)\n• Các loại đậu, hạt\n• Trái cây giàu vitamin C (cam, bưởi)",
};

// Hàm xử lý tin nhắn đơn giản (nhanh, không cần AI)
function simpleResponse(message) {
  const lowerMsg = message.toLowerCase();
  for (const [pattern, response] of Object.entries(KNOWLEDGE_BASE)) {
    if (lowerMsg.match(pattern)) return response;
  }
  return null;
}

// Hàm lấy thông tin donor (để cá nhân hóa)
async function getDonorContext(donorId) {
  try {
    const donor = await Donor.findById(donorId).select('fullName bloodGroup lastDonationDate donationHistory');
    if (!donor) return null;
    return {
      name: donor.fullName?.split(' ')[0] || 'bạn',
      bloodGroup: donor.bloodGroup,
      lastDonation: donor.lastDonationDate,
      totalDonations: donor.donationHistory?.length || 0,
    };
  } catch (error) {
    console.error('Get donor context error:', error);
    return null;
  }
}

// Hàm lấy điểm hiến máu gần nhất (gợi ý)
async function getNearestCamp(latitude, longitude) {
  try {
    const camps = await BloodCamp.find({ status: 'Upcoming', date: { $gte: new Date() } })
      .select('title location date');
    // Giả sử có tọa độ, tính khoảng cách (cần thêm trường coordinates)
    return camps.slice(0, 3);
  } catch (error) {
    return [];
  }
}

// Hàm gọi AI với fallback thông minh
export async function getOpenRouterResponse(userMessage, history = [], donorId = null, userLocation = null) {
  // 1. Thử xử lý nhanh bằng rule-based (cho câu hỏi phổ biến)
  const quickAnswer = simpleResponse(userMessage);
  if (quickAnswer) {
    console.log('⚡ Dùng rule-based response');
    return quickAnswer;
  }

  // 2. Lấy context của donor (nếu có)
  let donorContext = '';
  if (donorId) {
    const donor = await getDonorContext(donorId);
    if (donor) {
      donorContext = `\n[THÔNG TIN NGƯỜI DÙNG]\n- Tên: ${donor.name}\n- Nhóm máu: ${donor.bloodGroup}\n- Tổng số lần hiến: ${donor.totalDonations}\n- Lần hiến cuối: ${donor.lastDonation ? new Date(donor.lastDonation).toLocaleDateString('vi-VN') : 'chưa có'}\n`;
    }
  }

  // 3. Chuẩn bị messages với system prompt nâng cao
  const messages = [];
  messages.push({
    role: "system",
    content: `Bạn là BloodBot Pro - trợ lý AI thông minh của Ngân hàng Máu Việt Nam.

QUY TẮC QUAN TRỌNG:
1. Luôn trả lời bằng TIẾNG VIỆT, thân thiện, ấm áp.
2. TUYỆT ĐỐI KHÔNG đưa ra chẩn đoán y khoa.
3. Nếu không biết câu trả lời, hãy gợi ý người dùng liên hệ hotline 1900 6868.
4. Khuyến khích và động viên người dùng tham gia hiến máu.

KIẾN THỨC CHUYÊN SÂU:
- Điều kiện hiến máu: 18-60 tuổi, ≥45kg, không bệnh mãn tính
- Tần suất: Nam 3 tháng, Nữ 4 tháng
- Các nhóm máu và tỷ lệ dân số Việt Nam
- Lợi ích của hiến máu đối với sức khỏe

${donorContext}
Hãy trả lời câu hỏi của người dùng một cách tự nhiên và hữu ích nhất.`
  });
  
  for (const msg of history) {
    if (msg.role === 'user') messages.push({ role: 'user', content: msg.parts[0].text });
    else if (msg.role === 'model') messages.push({ role: 'assistant', content: msg.parts[0].text });
  }
  messages.push({ role: 'user', content: userMessage });

  // 4. Thử gọi AI với các model
  let lastError = null;
  for (const model of MODEL_LIST) {
    try {
      console.log(`🔄 [BloodBot] Đang thử model: ${model}`);
      const completion = await openrouter.chat.completions.create({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9,
      });
      console.log(`✅ [BloodBot] Thành công với model: ${model}`);
      const reply = completion.choices[0].message.content;
      
      // Thêm gợi ý hành động nếu câu hỏi về đặt lịch
      if (userMessage.toLowerCase().includes('đặt lịch') || userMessage.toLowerCase().includes('đăng ký')) {
        return reply + "\n\n💡 **Bạn có thể đặt lịch hiến máu ngay trong ứng dụng!** Hãy vào mục 'Điểm hiến máu' để chọn thời gian phù hợp.";
      }
      
      // Thêm lời kêu gọi hành động cho câu hỏi về lợi ích
      if (userMessage.toLowerCase().includes('lợi ích')) {
        return reply + "\n\n❤️ **Hãy đăng ký hiến máu ngay hôm nay để cứu lấy một mạng người!**";
      }
      
      return reply;
    } catch (error) {
      console.warn(`⚠️ [BloodBot] Model ${model} thất bại:`, error.message);
      lastError = error;
    }
  }

  // 5. Fallback cuối cùng: trả về thông báo lỗi và gợi ý
  console.error('❌ [BloodBot] Tất cả model đều thất bại:', lastError?.message);
  return `🤖 **BloodBot xin lỗi!** Hiện tại hệ thống AI đang quá tải. Bạn có thể:
  
📞 Gọi hotline: **1900 6868** để được tư vấn trực tiếp
📋 Xem thông tin trong mục "Điểm hiến máu" để đặt lịch
💬 Hoặc thử hỏi lại sau vài phút nữa

Cảm ơn bạn đã quan tâm đến hiến máu cứu người! ❤️`;
}

// Hàm rút gọn (không cần donor context) cho trường hợp không có donorId
export async function getSimpleResponse(userMessage, history = []) {
  return getOpenRouterResponse(userMessage, history, null, null);
}