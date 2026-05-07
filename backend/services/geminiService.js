// backend/services/geminiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function getGeminiResponse(userMessage, history = []) {
    // Sử dụng tên model chính xác (lấy từ bước 1, bỏ prefix 'models/')
    const modelName = "gemini-1.5-flash"; // hoặc "gemini-pro", "gemini-1.5-pro"
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Nếu không cần history, gọi đơn giản
    const result = await model.generateContent(userMessage);
    return result.response.text();
}