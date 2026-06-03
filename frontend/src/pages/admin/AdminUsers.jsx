import { useState, useEffect } from "react";
import axios from "axios";
import {
  Shield, Plus, Edit, Trash2, Search, X, Loader2,
  AlertTriangle, Check, Droplet, TestTube, Building, Users, Crown
} from "lucide-react";
import { useOutletContext } from "react-router-dom";

// ─── Phân loại quyền theo nghiệp vụ ──────────────────────────────────────────
const PERMISSION_GROUPS = [
  {
    group: "🩸 Nghiệp vụ Người hiến máu (Thùy)",
    color: "red",
    permissions: [
      { id: "manage_donors",      label: "Quản lý Người hiến máu" },
      { id: "manage_blood_camps", label: "Quản lý Chiến dịch Hiến máu" },
      { id: "manage_appointments",label: "Quản lý Lịch hẹn Hiến máu" },
    ],
  },
  {
    group: "🔬 Nghiệp vụ Phòng Xét nghiệm (Hòa)",
    color: "blue",
    permissions: [
      { id: "manage_blood_stock",   label: "Quản lý Kho máu & Nhập/Xuất" },
      { id: "manage_screening",     label: "Xét nghiệm & Duyệt kết quả" },
      { id: "view_expiring_alerts", label: "Cảnh báo Máu sắp hết hạn" },
    ],
  },
  {
    group: "🏥 Nghiệp vụ Bệnh viện (Hoàng)",
    color: "green",
    permissions: [
      { id: "manage_requests",   label: "Duyệt / Từ chối Yêu cầu Máu" },
      { id: "manage_facilities", label: "Duyệt / Quản lý Bệnh viện" },
      { id: "manage_handover",   label: "Quản lý Bàn giao Máu" },
    ],
  },
  {
    group: "⚙️ Quản trị Hệ thống (Khánh)",
    color: "purple",
    permissions: [
      { id: "manage_users",      label: "Quản lý Người dùng hệ thống" },
      { id: "manage_admins",     label: "Quản lý Tài khoản Admin" },
      { id: "view_reports",      label: "Xem Báo cáo Thống kê" },
      { id: "view_audit_logs",   label: "Xem Nhật ký Hệ thống" },
      { id: "send_notifications",label: "Gửi Thông báo Hệ thống" },
      { id: "manage_backup",     label: "Sao lưu & Phục hồi Dữ liệu" },
    ],
  },
];

// Preset quyền nhanh theo thành viên
const PRESETS = [
  { label: "🩸 Thùy – Người hiến máu", perms: ["manage_donors", "manage_blood_camps", "manage_appointments", "view_reports"] },
  { label: "🔬 Hòa – Phòng Xét nghiệm", perms: ["manage_blood_stock", "manage_screening", "view_expiring_alerts", "view_reports"] },
  { label: "🏥 Hoàng – Bệnh viện",       perms: ["manage_requests", "manage_facilities", "manage_handover", "view_reports"] },
  { label: "⚙️ Khánh – Admin Tổng",       perms: ["manage_users", "manage_admins", "view_reports", "view_audit_logs", "send_notifications", "manage_backup"] },
];

const DEPT_LABELS = {
  donor_management:    { label: "Người hiến máu", color: "bg-red-100 text-red-700",    icon: Droplet },
  lab_management:      { label: "Phòng Xét nghiệm", color: "bg-blue-100 text-blue-700", icon: TestTube },
  hospital_management: { label: "Bệnh viện",      color: "bg-green-100 text-green-700", icon: Building },
  admin:               { label: "Quản trị",        color: "bg-purple-100 text-purple-700", icon: Users },
};

const colorMap = {
  red:    { bg: "bg-red-50",    border: "border-red-100",    label: "bg-red-100 text-red-600" },
  blue:   { bg: "bg-blue-50",   border: "border-blue-100",   label: "bg-blue-100 text-blue-600" },
  green:  { bg: "bg-green-50",  border: "border-green-100",  label: "bg-green-100 text-green-600" },
  purple: { bg: "bg-purple-50", border: "border-purple-100", label: "bg-purple-100 text-purple-600" },
};

const AdminUsers = () => {
  const { userData } = useOutletContext();
  const [admins, setAdmins]         = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [isSaving, setIsSaving]     = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    id: null, name: "", email: "", password: "",
    role: "admin", department: "admin", permissions: [],
  });

  const token   = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchAdmins(); }, []);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get("http://localhost:5000/api/admin/manage", { headers });
      setAdmins(data.admins);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi tải danh sách quản trị viên");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (admin = null) => {
    if (admin) {
      setFormData({
        id: admin._id, name: admin.name, email: admin.email,
        password: "", role: admin.role,
        department: admin.department || "admin",
        permissions: admin.permissions || [],
      });
    } else {
      setFormData({ id: null, name: "", email: "", password: "", role: "admin", department: "admin", permissions: [] });
    }
    setIsModalOpen(true);
  };

  const handlePermissionToggle = (permId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId],
    }));
  };

  const applyPreset = (preset) => {
    setFormData(prev => ({ ...prev, permissions: preset.perms }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password;
      if (formData.id) {
        await axios.put(`http://localhost:5000/api/admin/manage/${formData.id}`, payload, { headers });
        setSuccessMsg("✅ Cập nhật tài khoản thành công!");
      } else {
        await axios.post("http://localhost:5000/api/admin/manage", payload, { headers });
        setSuccessMsg("✅ Tạo tài khoản mới thành công!");
      }
      setIsModalOpen(false);
      fetchAdmins();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi lưu");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa quản trị viên này?")) return;
    try {
      setIsDeleting(id);
      await axios.delete(`http://localhost:5000/api/admin/manage/${id}`, { headers });
      setSuccessMsg("✅ Đã xóa tài khoản thành công!");
      fetchAdmins();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi xóa");
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredAdmins = admins.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (userData?.role !== "superadmin") {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Shield size={64} className="text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Không có quyền truy cập</h2>
        <p className="text-gray-500 mt-2">Chỉ Superadmin mới có quyền quản lý tài khoản quản trị viên.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-red-50">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="text-red-600" /> Quản Lý Admin & Phân Quyền (RBAC)
          </h1>
          <p className="text-sm text-gray-500 mt-1">Phân quyền theo từng nghiệp vụ: Thùy · Hòa · Hoàng · Khánh</p>
        </div>
        <button onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all shadow-sm">
          <Plus size={18} /> Tạo Admin Mới
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 flex justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")}><X size={18} /></button>
        </div>
      )}

      {/* Team Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Thùy", dept: "donor_management",    desc: "Người hiến máu", icon: Droplet,  color: "red" },
          { label: "Hòa",  dept: "lab_management",      desc: "Phòng Xét nghiệm", icon: TestTube, color: "blue" },
          { label: "Hoàng",dept: "hospital_management", desc: "Bệnh viện",       icon: Building, color: "green" },
          { label: "Khánh",dept: "admin",               desc: "Quản trị tổng",  icon: Crown,    color: "purple" },
        ].map(({ label, dept, desc, icon: Icon, color }) => {
          const count = admins.filter(a => a.department === dept || (dept === "admin" && a.role === "superadmin")).length;
          const c = colorMap[color];
          return (
            <div key={dept} className={`${c.bg} border ${c.border} rounded-2xl p-4`}>
              <div className="flex items-center justify-between mb-2">
                <Icon size={20} className={c.label.split(" ")[1]} />
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.label}`}>{count}</span>
              </div>
              <div className="font-bold text-gray-800 text-sm">{label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-red-50">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Tìm theo tên hoặc email..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-50 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-red-600" size={32} /></div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 bg-red-50">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-red-50/50 text-gray-600 text-sm border-b border-red-100">
                  <th className="p-4 font-semibold">Tên & Email</th>
                  <th className="p-4 font-semibold">Nghiệp Vụ</th>
                  <th className="p-4 font-semibold">Quyền Hạn</th>
                  <th className="p-4 font-semibold text-center">Trạng Thái</th>
                  <th className="p-4 font-semibold text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAdmins.map(admin => {
                  const deptInfo = DEPT_LABELS[admin.department] || DEPT_LABELS.admin;
                  const DeptIcon = deptInfo.icon;
                  return (
                    <tr key={admin._id} className="hover:bg-red-50/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {admin.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800 text-sm">{admin.name}</div>
                            <div className="text-xs text-gray-500">{admin.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${deptInfo.color}`}>
                            <DeptIcon size={12} /> {deptInfo.label}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${
                            admin.role === "superadmin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                          }`}>
                            {admin.role === "superadmin" ? "👑 SUPERADMIN" : "ADMIN"}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 max-w-xs">
                        {admin.role === "superadmin" ? (
                          <span className="text-xs text-purple-600 font-semibold">✨ Toàn quyền hệ thống</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {admin.permissions?.slice(0, 4).map(p => (
                              <span key={p} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded border border-gray-200">
                                {p.replace(/manage_|view_|send_/, "").replace(/_/g, " ")}
                              </span>
                            ))}
                            {admin.permissions?.length > 4 && (
                              <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] rounded border border-red-100 font-semibold">
                                +{admin.permissions.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {admin.isActive !== false
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold"><Check size={12}/> Hoạt động</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-semibold"><AlertTriangle size={12}/> Tạm khóa</span>
                        }
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleOpenModal(admin)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Chỉnh sửa">
                            <Edit size={16} />
                          </button>
                          {admin.role !== "superadmin" && (
                            <button onClick={() => handleDelete(admin._id)} disabled={isDeleting === admin._id}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title="Xóa">
                              {isDeleting === admin._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredAdmins.length === 0 && (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-500">Không tìm thấy quản trị viên nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 flex justify-between items-center p-5 border-b border-gray-100 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">
                {formData.id ? "✏️ Cập Nhật Quản Trị Viên" : "➕ Tạo Quản Trị Viên Mới"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Họ và Tên <span className="text-red-500">*</span></label>
                  <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email <span className="text-red-500">*</span></label>
                  <input type="email" required className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Mật khẩu {formData.id ? <span className="text-gray-400 font-normal">(để trống nếu không đổi)</span> : <span className="text-red-500">*</span>}
                  </label>
                  <input type="password" required={!formData.id} minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm"
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Vai trò</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm"
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin (Toàn quyền)</option>
                  </select>
                </div>
              </div>

              {/* Dept */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nghiệp Vụ</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                  <option value="donor_management">🩸 Người hiến máu (Thùy)</option>
                  <option value="lab_management">🔬 Phòng Xét nghiệm (Hòa)</option>
                  <option value="hospital_management">🏥 Bệnh viện (Hoàng)</option>
                  <option value="admin">⚙️ Quản trị hệ thống (Khánh)</option>
                </select>
              </div>

              {/* Preset buttons */}
              {formData.role === "admin" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">🚀 Phân quyền nhanh theo thành viên</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map(p => (
                      <button key={p.label} type="button" onClick={() => applyPreset(p)}
                        className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-red-50 hover:text-red-700 border border-gray-200 hover:border-red-200 rounded-lg transition-colors font-medium">
                        {p.label}
                      </button>
                    ))}
                    <button type="button" onClick={() => setFormData(prev => ({...prev, permissions: []}))}
                      className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors text-gray-500">
                      Xóa hết
                    </button>
                  </div>
                </div>
              )}

              {/* Permissions grouped */}
              {formData.role === "admin" && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-gray-600">🔒 Phân Quyền Chi Tiết</label>
                  {PERMISSION_GROUPS.map(({ group, color, permissions }) => {
                    const c = colorMap[color];
                    return (
                      <div key={group} className={`${c.bg} border ${c.border} rounded-xl p-3`}>
                        <div className={`text-xs font-bold mb-2 ${c.label.split(" ")[1]}`}>{group}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {permissions.map(perm => (
                            <label key={perm.id} className="flex items-center gap-2 cursor-pointer group">
                              <input type="checkbox"
                                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                checked={formData.permissions.includes(perm.id)}
                                onChange={() => handlePermissionToggle(perm.id)} />
                              <span className="text-xs text-gray-700 group-hover:text-gray-900">{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {formData.role === "superadmin" && (
                <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-700 text-center font-medium">
                  👑 Superadmin có toàn quyền trên hệ thống — không cần chọn quyền riêng.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors text-sm">Hủy</button>
                <button type="submit" disabled={isSaving}
                  className="px-5 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-xl transition-colors shadow-sm text-sm disabled:opacity-60 flex items-center gap-2">
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  {formData.id ? "Lưu Thay Đổi" : "Tạo Tài Khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
