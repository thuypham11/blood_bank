import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import IdCardVerification from "../../components/IdCardVerification";

import {
  Loader2,
  Save,
  Edit3,
  X,
  MapPin,
  Mail,
  Phone,
  User,
  Shield,
  Heart,
  Droplet,
  Calendar,
  Award,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const GENDER_OPTIONS = [
  { value: "Male", label: "Nam" },
  { value: "Female", label: "Nữ" },
];

// Validation rules (giữ nguyên)
const VALIDATION_RULES = {
  fullName: { required: true, minLength: 2, maxLength: 200 },
  phone: { required: true, pattern: /^[0-9]{10}$/ },
  age: { required: true, min: 18, max: 65 },
  gender: { required: true },
  weight: { required: false, min: 45, max: 200 },
  bloodGroup: { required: true },
  "address.street": { required: true, minLength: 1 },
  "address.city": { required: true, minLength: 1 },
  "address.state": { required: true, minLength: 1 },
  "address.pincode": { required: true, pattern: /^[0-9]{6}$/ },
  password: { minLength: 8 },
};

const validateField = (name, value) => {
  const rules = VALIDATION_RULES[name];
  if (!rules) return null;
  const strValue = value !== undefined && value !== null ? String(value) : "";
  if (rules.required && !strValue.trim()) return "Trường này là bắt buộc";
  if (!strValue.trim() && !rules.required) return null;
  if (rules.minLength && strValue.trim().length < rules.minLength) return `Tối thiểu ${rules.minLength} ký tự`;
  if (rules.maxLength && strValue.trim().length > rules.maxLength) return `Không được vượt quá ${rules.maxLength} ký tự`;
  if (rules.min && Number(strValue) < rules.min) {
    if (name === "age") return "Phải từ 18 tuổi trở lên để hiến máu";
    if (name === "weight") return "Cân nặng tối thiểu để hiến máu là 45kg";
    return `Giá trị tối thiểu là ${rules.min}`;
  }
  if (rules.max && Number(strValue) > rules.max) {
    if (name === "age") return "Giới hạn tuổi hiến máu là 65";
    if (name === "weight") return `Giá trị tối đa là ${rules.max}`;
    return `Giá trị tối đa là ${rules.max}`;
  }
  if (rules.pattern && strValue && !rules.pattern.test(strValue)) {
    if (name === "phone") return "Vui lòng nhập số điện thoại hợp lệ 10 chữ số";
    if (name === "address.pincode") return "Vui lòng nhập mã bưu chính hợp lệ 6 chữ số";
    return "Định dạng không hợp lệ";
  }
  return null;
};

const getErrorMsg = (err) => {
  if (!err) return null;
  if (typeof err === "string") return err;
  if (typeof err === "object") return err.message || "Giá trị không hợp lệ";
  return String(err);
};

const DonorProfile = () => {
  const [donor, setDonor] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    age: "",
    gender: "",
    weight: "",
    bloodGroup: "",
    address: { street: "", city: "", state: "", pincode: "" },
    password: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Không tìm thấy token xác thực.");
      const { data } = await axios.get(`${API_BASE_URL}/donor/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const donorData = data?.donor || data;
      if (!donorData) throw new Error("Không nhận được dữ liệu hồ sơ từ server.");
      const rawGender = donorData.gender || "";
      const normalizedGender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase();
      setFormData({
        fullName: donorData.fullName || "",
        phone: donorData.phone || "",
        age: donorData.age || "",
        gender: normalizedGender,
        weight: donorData.weight || "",
        bloodGroup: donorData.bloodGroup || "",
        address: {
          street: donorData.address?.street || "",
          city: donorData.address?.city || "",
          state: donorData.address?.state || "",
          pincode: donorData.address?.pincode || "",
        },
        password: "",
      });
      setDonor({
        ...donorData,
        gender: normalizedGender,
        lastDonation: donorData.lastDonationDate || donorData.lastDonation || null,
        status: donorData.status || "active",
        donorId: donorData._id || donorData.donorId,
        isIdVerified: donorData.isIdVerified || false,
      });
    } catch (error) {
      console.error("Lỗi tải hồ sơ:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        setDonor(null);
        return;
      }
      toast.error(error.response?.data?.message || "Không thể tải hồ sơ.");
      setDonor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (refreshTrigger > 0) fetchProfile();
  }, [refreshTrigger, fetchProfile]);

  const handleIdVerified = () => {
    setRefreshTrigger(prev => prev + 1);
    toast.success("Xác thực CCCD thành công! Bạn có thể đặt lịch hiến máu.");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const key = name.split(".")[1];
      setFormData((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSave = async () => {
    const newErrors = {};
    Object.keys(VALIDATION_RULES).forEach((key) => {
      if (key === "password" && !formData.password) return;
      let value;
      if (key.startsWith("address.")) {
        const addressKey = key.split(".")[1];
        value = formData.address?.[addressKey];
      } else {
        value = formData[key];
      }
      const error = validateField(key, value);
      if (error) newErrors[key] = error;
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Vui lòng sửa các lỗi trước khi lưu");
      return;
    }
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Yêu cầu xác thực để lưu thay đổi.");
        return;
      }
      const safeTrim = (v) => (v ? String(v).trim() : "");
      const payload = {
        fullName: safeTrim(formData.fullName),
        phone: safeTrim(formData.phone),
        age: Number(formData.age),
        gender: formData.gender,
        weight: Number(formData.weight),
        bloodGroup: formData.bloodGroup,
        address: {
          street: safeTrim(formData.address?.street),
          city: safeTrim(formData.address?.city),
          state: safeTrim(formData.address?.state),
          pincode: safeTrim(formData.address?.pincode),
        },
      };
      if (formData.password && formData.password.length >= 6) payload.password = formData.password;
      const { data } = await axios.put(`${API_BASE_URL}/donor/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success || data.donor || data.message === "Profile updated successfully") {
        const updatedDonor = data.donor || { ...donor, ...payload };
        setDonor((prev) => ({
          ...prev,
          ...updatedDonor,
          donorId: updatedDonor._id || prev?.donorId,
          status: updatedDonor.status || prev?.status,
        }));
        setFormData({
          fullName: updatedDonor.fullName || payload.fullName || "",
          phone: updatedDonor.phone || payload.phone || "",
          age: updatedDonor.age || payload.age || "",
          gender: (updatedDonor.gender || payload.gender || "").charAt(0).toUpperCase() + (updatedDonor.gender || payload.gender || "").slice(1).toLowerCase(),
          weight: updatedDonor.weight || payload.weight || "",
          bloodGroup: updatedDonor.bloodGroup || payload.bloodGroup || "",
          address: {
            street: updatedDonor.address?.street || payload.address?.street || "",
            city: updatedDonor.address?.city || payload.address?.city || "",
            state: updatedDonor.address?.state || payload.address?.state || "",
            pincode: updatedDonor.address?.pincode || payload.address?.pincode || "",
          },
          password: "",
        });
        setIsEditing(false);
        setErrors({});
        toast.success("Cập nhật hồ sơ thành công! 🎉");
      } else {
        throw new Error(data.message || "Cập nhật thất bại, vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Lỗi lưu hồ sơ:", error);
      const backendErrors = error.response?.data?.errors;
      if (backendErrors) {
        const parsedErrors = {};
        if (typeof backendErrors === "object" && !Array.isArray(backendErrors)) {
          Object.entries(backendErrors).forEach(([field, errObj]) => {
            parsedErrors[field] = typeof errObj === "string" ? errObj : errObj?.message || "Giá trị không hợp lệ";
          });
        } else if (Array.isArray(backendErrors)) {
          backendErrors.forEach((e) => {
            const field = e.path || e.field || "unknown";
            parsedErrors[field] = e.message || "Giá trị không hợp lệ";
          });
        }
        setErrors(parsedErrors);
        const firstMsg = Object.values(parsedErrors)[0] || "Dữ liệu không hợp lệ.";
        toast.error(firstMsg);
        return;
      }
      if (error.response?.status === 401) {
        toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        localStorage.removeItem("token");
        return;
      }
      toast.error(error.response?.data?.message || "Không thể lưu thay đổi.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
    if (donor) {
      setFormData({
        fullName: donor.fullName || "",
        phone: donor.phone || "",
        age: donor.age || "",
        gender: (donor.gender || "").charAt(0).toUpperCase() + (donor.gender || "").slice(1).toLowerCase(),
        weight: donor.weight || "",
        bloodGroup: donor.bloodGroup || "",
        address: {
          street: donor.address?.street || "",
          city: donor.address?.city || "",
          state: donor.address?.state || "",
          pincode: donor.address?.pincode || "",
        },
        password: "",
      });
    }
  };

  if (loading && !donor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse mb-4"><Heart className="w-12 h-12 text-red-500 mx-auto" /></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Đang Tải Hồ Sơ</h2>
          <p className="text-gray-500">Đang chuẩn bị thông tin của bạn...</p>
        </div>
      </div>
    );
  }

  if (!donor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-lg border border-red-100 p-8">
          <Heart className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Lỗi Tải Hồ Sơ</h3>
          <p className="text-gray-600 mb-4">Không thể tải hồ sơ. Vui lòng đảm bảo bạn đã đăng nhập.</p>
          <button onClick={fetchProfile} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg">Thử Lại</button>
        </div>
      </div>
    );
  }

  const addressFields = [
    { key: "street", label: "Địa Chỉ Đường", span: true },
    { key: "city", label: "Quận/Huyện" },
    { key: "state", label: "Tỉnh/Thành Phố" },
    { key: "pincode", label: "Mã Bưu Chính (6 số)", type: "text" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
      <Toaster />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl"><Heart className="w-8 h-8 text-red-600" /></div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">{donor.fullName || "Hồ Sơ Người Hiến Máu"}</h1>
                <p className="text-gray-600 mt-1 flex items-center gap-2">
                  <Droplet size={16} className="text-red-500" />
                  {donor.bloodGroup || "Người Hiến Máu"} • <span className="font-mono text-sm">Mã: {donor.donorId}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <button onClick={handleCancel} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg border border-gray-300"><X size={18} /> Hủy</button>
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />} Lưu Thay Đổi
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"><Edit3 size={18} /> Chỉnh Sửa Hồ Sơ</button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status card */}
            <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-red-600" /> Trạng Thái</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Trạng Thái</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${donor.status === "active" ? "bg-green-100 text-green-700" : donor.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                    {donor.status === "active" ? "Hoạt Động" : donor.status === "pending" ? "Chờ Xét Duyệt" : "Không Hoạt Động"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Nhóm Máu</span>
                  <span className="text-sm font-bold text-red-600">{donor.bloodGroup || "Chưa cập nhật"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Mã Người Hiến</span>
                  <span className="text-sm font-mono text-gray-800">{donor.donorId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Xác thực CCCD</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${donor.isIdVerified ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {donor.isIdVerified ? "Đã xác thực" : "Chưa xác thực"}
                  </span>
                </div>
                {donor.lastDonation && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Lần Hiến Cuối</span>
                    <span className="text-sm text-gray-800">{new Date(donor.lastDonation).toLocaleDateString("vi-VN")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick info card */}
            <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><User className="w-5 h-5 text-red-600" /> Thông Tin Nhanh</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm"><Mail className="w-4 h-4 text-red-500" /><span className="text-gray-600 truncate">{donor.email}</span></div>
                {donor.phone && <div className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-red-500" /><span className="text-gray-600">{donor.phone}</span></div>}
                {donor.age && <div className="flex items-center gap-3 text-sm"><Calendar className="w-4 h-4 text-red-500" /><span className="text-gray-600">{donor.age} tuổi</span></div>}
              </div>
            </div>

            {/* ID Card Verification Component */}
            <IdCardVerification donor={donor} onVerified={handleIdVerified} />
          </div>

          {/* Main content - Edit form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6">
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2"><User className="w-5 h-5 text-red-600" /> Thông Tin Cá Nhân</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Họ Và Tên</label>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-xl border ${isEditing ? "border-gray-300 bg-white focus:ring-2 focus:ring-red-500" : "bg-gray-50 border-gray-200"} ${errors.fullName ? "border-red-500" : ""}`} />
                    {errors.fullName && <p className="text-red-500 text-xs mt-2"><AlertCircle size={12} /> {getErrorMsg(errors.fullName)}</p>}
                  </div>
                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Số Điện Thoại</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-xl border ${isEditing ? "border-gray-300 bg-white focus:ring-2 focus:ring-red-500" : "bg-gray-50 border-gray-200"} ${errors.phone ? "border-red-500" : ""}`} />
                    {errors.phone && <p className="text-red-500 text-xs mt-2"><AlertCircle size={12} /> {getErrorMsg(errors.phone)}</p>}
                  </div>
                  {/* Age */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tuổi</label>
                    <input type="number" name="age" value={formData.age} onChange={handleChange} disabled={!isEditing} min="18" max="65"
                      className={`w-full px-4 py-3 rounded-xl border ${isEditing ? "border-gray-300 bg-white focus:ring-2 focus:ring-red-500" : "bg-gray-50 border-gray-200"} ${errors.age ? "border-red-500" : ""}`} />
                    {errors.age && <p className="text-red-500 text-xs mt-2"><AlertCircle size={12} /> {getErrorMsg(errors.age)}</p>}
                  </div>
                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Giới Tính</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-xl border ${isEditing ? "border-gray-300 bg-white focus:ring-2 focus:ring-red-500" : "bg-gray-50 border-gray-200"} ${errors.gender ? "border-red-500" : ""}`}>
                      <option value="">Chọn Giới Tính</option>
                      {GENDER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    {errors.gender && <p className="text-red-500 text-xs mt-2"><AlertCircle size={12} /> {getErrorMsg(errors.gender)}</p>}
                  </div>
                  {/* Weight */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cân Nặng (kg)</label>
                    <input type="number" name="weight" value={formData.weight} onChange={handleChange} disabled={!isEditing} min="45" max="200" step="0.1"
                      className={`w-full px-4 py-3 rounded-xl border ${isEditing ? "border-gray-300 bg-white focus:ring-2 focus:ring-red-500" : "bg-gray-50 border-gray-200"} ${errors.weight ? "border-red-500" : ""}`} />
                    {errors.weight && <p className="text-red-500 text-xs mt-2"><AlertCircle size={12} /> {getErrorMsg(errors.weight)}</p>}
                  </div>
                  {/* Blood Group */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nhóm Máu</label>
                    <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-xl border ${isEditing ? "border-gray-300 bg-white focus:ring-2 focus:ring-red-500" : "bg-gray-50 border-gray-200"} ${errors.bloodGroup ? "border-red-500" : ""}`}>
                      <option value="">Chọn Nhóm Máu</option>
                      {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    {errors.bloodGroup && <p className="text-red-500 text-xs mt-2"><AlertCircle size={12} /> {getErrorMsg(errors.bloodGroup)}</p>}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-red-600" /> Thông Tin Địa Chỉ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addressFields.map(({ key, label, span, type }) => (
                    <div key={key} className={span ? "md:col-span-2" : ""}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                      <input type={type || "text"} name={`address.${key}`} value={formData.address?.[key] || ""} onChange={handleChange} disabled={!isEditing}
                        className={`w-full px-4 py-3 rounded-xl border ${isEditing ? "border-gray-300 bg-white focus:ring-2 focus:ring-red-500" : "bg-gray-50 border-gray-200"} ${errors[`address.${key}`] ? "border-red-500" : ""}`} />
                      {errors[`address.${key}`] && <p className="text-red-500 text-xs mt-2"><AlertCircle size={12} /> {getErrorMsg(errors[`address.${key}`])}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Email (read-only) */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2"><Mail className="w-5 h-5 text-red-600" /> Địa Chỉ Email</h3>
                <input type="email" value={donor.email} disabled className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600" />
                <p className="text-xs text-gray-500 mt-2">Email không thể thay đổi</p>
              </div>

              {/* Change password */}
              {isEditing && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Đổi Mật Khẩu</h3>
                  <div className="max-w-md">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mật Khẩu Mới (không bắt buộc)</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-red-500 ${errors.password ? "border-red-500" : ""}`} placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)" />
                    {errors.password && <p className="text-red-500 text-xs mt-2"><AlertCircle size={12} /> {getErrorMsg(errors.password)}</p>}
                    <p className="text-xs text-gray-500 mt-2">Để trống nếu không muốn thay đổi mật khẩu</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonorProfile;