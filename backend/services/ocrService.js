// backend/services/ocrService.js
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

/**
 * Trích xuất thông tin từ ảnh CCCD mặt trước bằng FPT AI
 * @param {string} imagePath - Đường dẫn file ảnh tạm
 * @returns {Promise<{ success: boolean, data?: object, message?: string }>}
 */
export async function extractIdCardInfo(imagePath) {
  const formData = new FormData();
  formData.append("image", fs.createReadStream(imagePath));

  try {
    const response = await axios.post(
      "https://api.fpt.ai/vision/idr/vnm",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "api-key": process.env.FPT_API_KEY,
        },
      }
    );

    const data = response.data;
    if (data.errorCode === 0 && data.data && data.data.length > 0) {
      const info = data.data[0];
      // Chuẩn hóa ngày sinh về định dạng YYYY-MM-DD nếu cần
      const formatDate = (dateStr) => {
        if (!dateStr) return null;
        // Nếu định dạng DD/MM/YYYY -> YYYY-MM-DD
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
      };

      return {
        success: true,
        data: {
          number: info.idNumber || "",
          fullName: info.fullName || "",
          birthDate: formatDate(info.dateOfBirth),
          gender: info.sex === "Nam" ? "Nam" : (info.sex === "Nữ" ? "Nữ" : ""),
          home: info.home || "",
          address: info.address || "",
          issueDate: formatDate(info.issueDate),
          expiryDate: formatDate(info.expiryDate),
        },
      };
    } else {
      return { success: false, message: data.message || "Không thể nhận dạng CCCD" };
    }
  } catch (error) {
    console.error("FPT AI OCR Error:", error.response?.data || error.message);
    return { success: false, message: "Lỗi kết nối dịch vụ nhận dạng" };
  }
}