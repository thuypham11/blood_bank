import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function getGeminiResponse(userMessage, history = []) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(userMessage);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    if (error.message.includes("API key")) {
      return "🔑 API key không hợp lệ. Vui lòng kiểm tra cấu hình.";
    }
    if (error.message.includes("not found")) {
      return "🤖 Model AI tạm thời không khả dụng. Vui lòng thử lại sau.";
    }
    return "Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau! 🙏";
  }
}