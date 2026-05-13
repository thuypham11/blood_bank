// frontend/src/components/IdCardVerification.jsx
import { useState } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";

const IdCardVerification = ({ onVerified }) => {
  const [uploading, setUploading] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [formData, setFormData] = useState({
    number: "", fullName: "", birthDate: "", gender: "", home: "", address: "", issueDate: "", expiryDate: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh không quá 5MB");
      return;
    }
    const fd = new FormData();
    fd.append("idCardImage", file);
    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      // SỬA: gửi fd (FormData chứa file) thay vì formData (state)
      const { data } = await axios.post("/api/donor/upload-id-card", fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      if (data.success) {
        setExtracted(data.data);
        setFormData(data.data);
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi gửi ảnh, thử lại");
    } finally {
      setUploading(false);
    }
  };

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      // Gửi đúng object { idCardData: formData } như backend yêu cầu
      const { data } = await axios.post("/api/donor/verify-id-card", { idCardData: formData }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        toast.success(data.message);
        onVerified && onVerified();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold">Xác thực Căn cước công dân (bắt buộc)</h2>
      <div className="border-2 border-dashed border-gray-300 p-4 text-center">
        <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
        {uploading && <p>Đang xử lý ảnh...</p>}
      </div>
      {extracted && (
        <div className="space-y-3">
          <h3 className="font-semibold">Thông tin trích xuất (kiểm tra lại)</h3>
          <div className="grid grid-cols-2 gap-3">
            <label>Số CCCD: <input name="number" value={formData.number} onChange={onChange} className="border p-2 rounded w-full" /></label>
            <label>Họ tên: <input name="fullName" value={formData.fullName} onChange={onChange} className="border p-2 rounded w-full" /></label>
            <label>Ngày sinh: <input name="birthDate" value={formData.birthDate} onChange={onChange} className="border p-2 rounded w-full" /></label>
            <label>Giới tính: <select name="gender" value={formData.gender} onChange={onChange} className="border p-2 rounded w-full"><option>Nam</option><option>Nữ</option></select></label>
            <label className="col-span-2">Quê quán: <input name="home" value={formData.home} onChange={onChange} className="border p-2 rounded w-full" /></label>
            <label className="col-span-2">Địa chỉ thường trú: <input name="address" value={formData.address} onChange={onChange} className="border p-2 rounded w-full" /></label>
          </div>
          <button onClick={handleSubmit} disabled={submitting} className="bg-red-600 text-white px-4 py-2 rounded-lg w-full">Xác nhận và lưu</button>
        </div>
      )}
    </div>
  );
};

export default IdCardVerification;