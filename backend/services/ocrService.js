import axios from "axios";
import FormData from "form-data";
import fs from "fs";

export async function extractIdCardInfo(imagePath) {
  const apiKey = process.env.FPT_API_KEY;
  if (!apiKey) return { success: false, message: "Chưa cấu hình FPT_API_KEY" };

  const formData = new FormData();
  formData.append("image", fs.createReadStream(imagePath));

  try {
    const response = await axios.post(
      "https://api.fpt.ai/vision/idr/vnm",
      formData,
      {
        headers: { ...formData.getHeaders(), "api-key": apiKey },
        timeout: 30000,
      }
    );

    const data = response.data;
    if (data.errorCode === 0 && data.data && data.data.length > 0) {
      const info = data.data[0];

      // Hàm chuyển đổi ngày từ DD/MM/YYYY sang YYYY-MM-DD
      const formatDate = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.split("/");
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return dateStr;
      };

      return {
        success: true,
        data: {
          number: info.id || "",
          fullName: info.name || "",
          birthDate: formatDate(info.dob),
          gender: info.sex === "Nam" ? "Nam" : info.sex === "Nữ" ? "Nữ" : "",
          home: info.home || "",
          address: info.address || "",
          issueDate: "", // FPT AI không trả về ngày cấp, có thể để trống hoặc donor tự nhập
          expiryDate: formatDate(info.doe), // doe = date of expiry
        },
      };
    } else {
      return { success: false, message: data.message || "Không nhận dạng được CCCD" };
    }
  } catch (error) {
    console.error("OCR Error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      return { success: false, message: "Sai API key hoặc key không có quyền" };
    }
    return { success: false, message: "Lỗi kết nối dịch vụ OCR" };
  }
}