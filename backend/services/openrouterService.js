// backend/services/openrouterService.js
import OpenAI from 'openai';

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

// Danh sách model thử nghiệm theo thứ tự ưu tiên
const MODEL_LIST = [
  "openrouter/auto",           // Tự động chọn model tốt nhất, có free tier
  "openrouter/cas:free",       // Model tổng hợp, ổn định
  "microsoft/phi-3-mini-128k-instruct:free", // Model nhẹ, nhanh
  "google/gemini-2.0-flash-exp:free", // Nếu vẫn muốn thử Gemini
  "meta-llama/llama-3.2-3b-instruct:free" // Llama 3.2 nhẹ
];

export async function getOpenRouterResponse(userMessage, history = []) {
  // Chuẩn bị messages
  const messages = [];
  messages.push({
    role: "system",
    content: "Bạn là BloodBot - trợ lý ảo của Ngân hàng Máu Việt Nam. Nhiệm vụ: tư vấn về hiến máu (điều kiện, quy trình, lợi ích, nhóm máu, địa điểm...). Trả lời bằng tiếng Việt, ngắn gọn, thân thiện."
  });
  
  for (const msg of history) {
    if (msg.role === 'user') messages.push({ role: 'user', content: msg.parts[0].text });
    else if (msg.role === 'model') messages.push({ role: 'assistant', content: msg.parts[0].text });
  }
  messages.push({ role: 'user', content: userMessage });

  // Thử từng model cho đến khi thành công
  for (const model of MODEL_LIST) {
    try {
      console.log(`🔄 Đang thử model: ${model}`);
      const completion = await getClient().chat.completions.create({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 800,
      });
      console.log(`✅ Thành công với model: ${model}`);
      return completion.choices[0].message.content;
    } catch (error) {
      console.warn(`⚠️ Model ${model} thất bại:`, error.message);
      // Tiếp tục thử model tiếp theo
    }
  }

  // Nếu tất cả đều thất bại, trả về thông báo lỗi
  return "Xin lỗi, tất cả các model AI đều tạm thời không khả dụng. Vui lòng thử lại sau hoặc sử dụng hệ thống trợ giúp có sẵn. 🙏";
}