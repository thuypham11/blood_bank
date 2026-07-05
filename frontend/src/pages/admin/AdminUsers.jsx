import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Shield, Plus, Edit, Trash2, Search, X, Loader2,
  AlertTriangle, Check, Droplet, TestTube, Building, Users, Crown,
  UserCircle2, Hospital, Lock, Unlock, Eye, ChevronDown, KeyRound
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

const BLOOD_GROUP_COLORS = {
  "A+": "bg-red-100 text-red-700", "A-": "bg-red-200 text-red-800",
  "B+": "bg-blue-100 text-blue-700", "B-": "bg-blue-200 text-blue-800",
  "O+": "bg-orange-100 text-orange-700", "O-": "bg-orange-200 text-orange-800",
  "AB+": "bg-purple-100 text-purple-700", "AB-": "bg-purple-200 text-purple-800",
};

const FACILITY_TYPE_LABELS = {
  hospital:    { label: "Bệnh viện",      color: "bg-green-100 text-green-700" },
  blood_bank:  { label: "Ngân hàng máu",  color: "bg-red-100 text-red-700" },
  clinic:      { label: "Phòng khám",     color: "bg-blue-100 text-blue-700" },
  blood_lab:   { label: "Phòng xét nghiệm", color: "bg-indigo-100 text-indigo-700" },
  other:       { label: "Khác",           color: "bg-gray-100 text-gray-700" },
};

// ── TABS ──────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "admin",    label: "Admin & Phân quyền", icon: Shield },
  { key: "donor",   label: "Người Hiến Máu",     icon: Droplet },
  { key: "facility",label: "Cơ Sở Y Tế",         icon: Hospital },
];

const AdminUsers = () => {
  const { userData } = useOutletContext();
  const [activeTab, setActiveTab] = useState("admin");

  // ── Admin Tab State ──────────────────────────────────────────────
  const [admins, setAdmins]           = useState([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError]   = useState(null);
  const [searchAdmin, setSearchAdmin] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting]   = useState(null);
  const [isSaving, setIsSaving]       = useState(false);
  const [successMsg, setSuccessMsg]   = useState("");
  const [formData, setFormData] = useState({
    id: null, name: "", email: "", password: "",
    role: "admin", department: "admin", permissions: [],
  });

  // ── Donor Tab State ───────────────────────────────────────────────
  const [donors, setDonors]           = useState([]);
  const [donorLoading, setDonorLoading] = useState(false);
  const [searchDonor, setSearchDonor] = useState("");
  const [donorPage, setDonorPage]     = useState(1);
  const [donorTotal, setDonorTotal]   = useState(0);
  const [donorBgFilter, setDonorBgFilter] = useState("");
  const [donorEligFilter, setDonorEligFilter] = useState("");
  const [expandedDonor, setExpandedDonor] = useState(null);
  const [resettingDonor, setResettingDonor] = useState(null); // id đang reset password

  // ── Facility Tab State ────────────────────────────────────────────
  const [facilities, setFacilities]       = useState([]);
  const [facilityLoading, setFacilityLoading] = useState(false);
  const [searchFacility, setSearchFacility]   = useState("");
  const [facilityPage, setFacilityPage]       = useState(1);
  const [facilityTotal, setFacilityTotal]     = useState(0);
  const [facilityStatusFilter, setFacilityStatusFilter] = useState("");

  const token   = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const LIMIT   = 15;

  // ═══════════════════════════════════════════════════════════════
  // ADMIN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  const fetchAdmins = useCallback(async () => {
    setAdminLoading(true);
    try {
      const { data } = await axios.get("http://localhost:5000/api/admin/manage", { headers });
      setAdmins(data.admins);
    } catch (err) {
      setAdminError(err.response?.data?.message || "Lỗi tải danh sách quản trị viên");
    } finally {
      setAdminLoading(false);
    }
  }, []);

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

  const applyPreset = (preset) => setFormData(prev => ({ ...prev, permissions: preset.perms }));

  const handleSubmitAdmin = async (e) => {
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

  const handleDeleteAdmin = async (id) => {
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
    a.name?.toLowerCase().includes(searchAdmin.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchAdmin.toLowerCase())
  );

  // ═══════════════════════════════════════════════════════════════
  // DONOR MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  const fetchDonors = useCallback(async () => {
    setDonorLoading(true);
    try {
      const params = { page: donorPage, limit: LIMIT };
      if (searchDonor) params.search = searchDonor;
      if (donorBgFilter) params.bloodGroup = donorBgFilter;
      if (donorEligFilter) params.eligible = donorEligFilter;
      const { data } = await axios.get("http://localhost:5000/api/admin/donors", { headers, params });
      setDonors(data.donors || []);
      setDonorTotal(data.total || 0);
    } catch (err) {
      console.error("Lỗi tải donors:", err);
    } finally {
      setDonorLoading(false);
    }
  }, [donorPage, searchDonor, donorBgFilter, donorEligFilter]);

  const handleToggleDonorStatus = async (donor) => {
    const action = donor.isActive === false ? "mở khóa" : "khóa";
    if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản "${donor.fullName}"?`)) return;
    try {
      await axios.put(`http://localhost:5000/api/admin/donor/${donor._id}`, { isActive: donor.isActive === false }, { headers });
      setSuccessMsg(`✅ Đã ${action} tài khoản thành công!`);
      fetchDonors();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi thao tác");
    }
  };

  const handleDeleteDonor = async (donor) => {
    if (!window.confirm(`Xóa vĩnh viễn tài khoản "${donor.fullName}"? Thao tác này không thể hoàn tác!`)) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/donor/${donor._id}`, { headers });
      setSuccessMsg("✅ Đã xóa tài khoản người hiến máu!");
      fetchDonors();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi xóa tài khoản");
    }
  };

  const handleResetDonorPassword = async (donor) => {
    if (!window.confirm(`Đặt lại mật khẩu cho "${donor.fullName}" và gửi mật khẩu mới về email ${donor.email}?`)) return;
    try {
      setResettingDonor(donor._id);
      const { data } = await axios.post(
        `http://localhost:5000/api/admin/donor/${donor._id}/reset-password`,
        {},
        { headers }
      );
      setSuccessMsg(data.message || "✅ Đã đặt lại mật khẩu!");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi đặt lại mật khẩu");
    } finally {
      setResettingDonor(null);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // FACILITY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  const fetchFacilities = useCallback(async () => {
    setFacilityLoading(true);
    try {
      const params = { page: facilityPage, limit: LIMIT };
      if (searchFacility) params.search = searchFacility;
      if (facilityStatusFilter) params.status = facilityStatusFilter;
      const { data } = await axios.get("http://localhost:5000/api/admin/facilities", { headers, params });
      setFacilities(data.facilities || []);
      setFacilityTotal(data.total || 0);
    } catch (err) {
      console.error("Lỗi tải facilities:", err);
    } finally {
      setFacilityLoading(false);
    }
  }, [facilityPage, searchFacility, facilityStatusFilter]);

  const handleApproveFacility = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/admin/facility/approve/${id}`, {}, { headers });
      setSuccessMsg("✅ Đã duyệt cơ sở y tế!");
      fetchFacilities();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi duyệt");
    }
  };

  const handleRejectFacility = async (id) => {
    const reason = window.prompt("Nhập lý do từ chối:");
    if (!reason) return;
    try {
      await axios.put(`http://localhost:5000/api/admin/facility/reject/${id}`, { rejectionReason: reason }, { headers });
      setSuccessMsg("✅ Đã từ chối cơ sở y tế!");
      fetchFacilities();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi từ chối");
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => { if (activeTab === "admin") fetchAdmins(); }, [activeTab]);
  useEffect(() => { if (activeTab === "donor") fetchDonors(); }, [activeTab, fetchDonors]);
  useEffect(() => { if (activeTab === "facility") fetchFacilities(); }, [activeTab, fetchFacilities]);

  // Debounce search
  useEffect(() => {
    if (activeTab !== "donor") return;
    const t = setTimeout(() => { setDonorPage(1); fetchDonors(); }, 400);
    return () => clearTimeout(t);
  }, [searchDonor, donorBgFilter, donorEligFilter]);

  useEffect(() => {
    if (activeTab !== "facility") return;
    const t = setTimeout(() => { setFacilityPage(1); fetchFacilities(); }, 400);
    return () => clearTimeout(t);
  }, [searchFacility, facilityStatusFilter]);

  if (userData?.role !== "superadmin") {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Shield size={64} className="text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Không có quyền truy cập</h2>
        <p className="text-gray-500 mt-2">Chỉ Superadmin mới có quyền quản lý tài khoản.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-red-50">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <UserCircle2 className="text-red-600" /> Quản Lý Tài Khoản Hệ Thống
          </h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý tất cả tài khoản: Admin · Người hiến máu · Cơ sở y tế</p>
        </div>
        {activeTab === "admin" && (
          <button onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all shadow-sm">
            <Plus size={18} /> Tạo Admin Mới
          </button>
        )}
      </div>

      {/* Success Message */}
      {successMsg && (
        <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 flex justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")}><X size={18} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === key
                ? "bg-red-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════ TAB: ADMIN ══════════════════════════════ */}
      {activeTab === "admin" && (
        <div className="space-y-4">
          {/* Team overview */}
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
                value={searchAdmin} onChange={e => setSearchAdmin(e.target.value)} />
            </div>
          </div>

          {/* Admin Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-red-50 overflow-hidden">
            {adminLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-red-600" size={32} /></div>
            ) : adminError ? (
              <div className="p-8 text-center text-red-600 bg-red-50">{adminError}</div>
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
                                <button onClick={() => handleDeleteAdmin(admin._id)} disabled={isDeleting === admin._id}
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
        </div>
      )}

      {/* ══════════════════════════════ TAB: DONOR ══════════════════════════════ */}
      {activeTab === "donor" && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Tổng tài khoản", val: donorTotal, color: "bg-red-600" },
              { label: "Đủ điều kiện", val: donors.filter(d => d.eligibleToDonate).length, color: "bg-green-500" },
              { label: "Chưa đủ điều kiện", val: donors.filter(d => !d.eligibleToDonate).length, color: "bg-yellow-500" },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
                  <Droplet size={18} className="text-white" />
                </div>
                <div>
                  <div className="text-xl font-black text-gray-800">{val}</div>
                  <div className="text-xs text-gray-500 font-medium">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Tìm theo tên, email, SĐT..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                value={searchDonor} onChange={e => setSearchDonor(e.target.value)} />
            </div>
            <select value={donorBgFilter} onChange={e => setDonorBgFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
              <option value="">Tất cả nhóm máu</option>
              {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
            <select value={donorEligFilter} onChange={e => setDonorEligFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
              <option value="">Tất cả trạng thái</option>
              <option value="true">Đủ điều kiện</option>
              <option value="false">Chưa đủ điều kiện</option>
            </select>
          </div>

          {/* Donor Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {donorLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-red-600" size={32} /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                      <th className="p-4 font-semibold">Họ tên & Liên hệ</th>
                      <th className="p-4 font-semibold text-center">Nhóm máu</th>
                      <th className="p-4 font-semibold">Địa chỉ</th>
                      <th className="p-4 font-semibold text-center">Trạng thái</th>
                      <th className="p-4 font-semibold text-center">Lần hiến</th>
                      <th className="p-4 font-semibold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {donors.map(donor => (
                      <>
                        <tr key={donor._id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {donor.fullName?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-800 text-sm">{donor.fullName}</div>
                                <div className="text-xs text-gray-500">{donor.email}</div>
                                <div className="text-xs text-gray-400">{donor.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${BLOOD_GROUP_COLORS[donor.bloodGroup] || "bg-gray-100 text-gray-600"}`}>
                              🩸 {donor.bloodGroup}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            <div className="max-w-[160px] truncate">
                              {[donor.address?.street, donor.address?.ward, donor.address?.city, donor.address?.state].filter(Boolean).join(", ") || "—"}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {donor.isActive === false ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-semibold">
                                <Lock size={10}/> Đã khóa
                              </span>
                            ) : donor.eligibleToDonate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                                <Check size={10}/> Đủ ĐK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-semibold">
                                <AlertTriangle size={10}/> Chưa đủ
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className="font-bold text-gray-700">{donor.donationHistory?.length || 0}</span>
                            <span className="text-xs text-gray-400 ml-1">lần</span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setExpandedDonor(expandedDonor === donor._id ? null : donor._id)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Xem chi tiết">
                                <Eye size={15} />
                              </button>
                              <button onClick={() => handleResetDonorPassword(donor)}
                                disabled={resettingDonor === donor._id}
                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-40" title="Đặt lại mật khẩu & gửi email">
                                {resettingDonor === donor._id ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                              </button>
                              <button onClick={() => handleToggleDonorStatus(donor)}
                                className={`p-2 rounded-lg transition-colors ${donor.isActive === false
                                  ? "text-green-600 hover:bg-green-50"
                                  : "text-orange-500 hover:bg-orange-50"
                                }`} title={donor.isActive === false ? "Mở khóa" : "Khóa tài khoản"}>
                                {donor.isActive === false ? <Unlock size={15} /> : <Lock size={15} />}
                              </button>
                              <button onClick={() => handleDeleteDonor(donor)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded row */}
                        {expandedDonor === donor._id && (
                          <tr className="bg-blue-50/40">
                            <td colSpan="6" className="px-6 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <div className="text-xs text-gray-400 font-medium uppercase mb-1">Tuổi / Giới tính</div>
                                  <div className="font-semibold text-gray-700">{donor.age} tuổi • {donor.gender === "male" ? "Nam" : donor.gender === "female" ? "Nữ" : donor.gender || "—"}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-400 font-medium uppercase mb-1">Lần hiến gần nhất</div>
                                  <div className="font-semibold text-gray-700">
                                    {donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString("vi-VN") : "Chưa có"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-400 font-medium uppercase mb-1">Ngày đăng ký</div>
                                  <div className="font-semibold text-gray-700">{new Date(donor.createdAt).toLocaleDateString("vi-VN")}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-400 font-medium uppercase mb-1">Tổng số hiến</div>
                                  <div className="font-semibold text-red-600 text-lg">{donor.donationHistory?.length || 0} lần</div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                    {donors.length === 0 && !donorLoading && (
                      <tr><td colSpan="6" className="p-8 text-center text-gray-400">Không tìm thấy người hiến máu.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {/* Pagination */}
            {donorTotal > LIMIT && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">Tổng: <strong>{donorTotal}</strong> tài khoản</span>
                <div className="flex gap-2">
                  <button onClick={() => setDonorPage(p => Math.max(1, p - 1))} disabled={donorPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Trước</button>
                  <span className="px-3 py-1.5 text-sm font-semibold">Trang {donorPage} / {Math.ceil(donorTotal / LIMIT)}</span>
                  <button onClick={() => setDonorPage(p => p + 1)} disabled={donorPage >= Math.ceil(donorTotal / LIMIT)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Tiếp →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════ TAB: FACILITY ══════════════════════════ */}
      {activeTab === "facility" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Tìm theo tên cơ sở, email..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                value={searchFacility} onChange={e => setSearchFacility(e.target.value)} />
            </div>
            <select value={facilityStatusFilter} onChange={e => setFacilityStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Bị từ chối</option>
            </select>
          </div>

          {/* Facility Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {facilityLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-red-600" size={32} /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                      <th className="p-4 font-semibold">Tên Cơ Sở & Liên hệ</th>
                      <th className="p-4 font-semibold">Loại</th>
                      <th className="p-4 font-semibold">Địa chỉ</th>
                      <th className="p-4 font-semibold text-center">Trạng thái</th>
                      <th className="p-4 font-semibold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {facilities.map(fac => {
                      const typeInfo = FACILITY_TYPE_LABELS[fac.facilityType] || FACILITY_TYPE_LABELS.other;
                      return (
                        <tr key={fac._id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {fac.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-800 text-sm">{fac.name}</div>
                                <div className="text-xs text-gray-500">{fac.email}</div>
                                <div className="text-xs text-gray-400">{fac.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            <div className="max-w-[180px] truncate">
                              {[fac.address?.street, fac.address?.state].filter(Boolean).join(", ") || "—"}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {fac.status === "approved" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                                <Check size={10}/> Đã duyệt
                              </span>
                            ) : fac.status === "rejected" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-semibold">
                                <X size={10}/> Từ chối
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-semibold">
                                <AlertTriangle size={10}/> Chờ duyệt
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {fac.status === "pending" && (
                                <>
                                  <button onClick={() => handleApproveFacility(fac._id)}
                                    className="px-3 py-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded-lg transition-colors">
                                    ✅ Duyệt
                                  </button>
                                  <button onClick={() => handleRejectFacility(fac._id)}
                                    className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg transition-colors">
                                    ❌ Từ chối
                                  </button>
                                </>
                              )}
                              {fac.status !== "pending" && (
                                <span className="text-xs text-gray-400 italic">Đã xử lý</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {facilities.length === 0 && !facilityLoading && (
                      <tr><td colSpan="5" className="p-8 text-center text-gray-400">Không tìm thấy cơ sở y tế.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {/* Pagination */}
            {facilityTotal > LIMIT && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">Tổng: <strong>{facilityTotal}</strong> cơ sở</span>
                <div className="flex gap-2">
                  <button onClick={() => setFacilityPage(p => Math.max(1, p - 1))} disabled={facilityPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Trước</button>
                  <span className="px-3 py-1.5 text-sm font-semibold">Trang {facilityPage} / {Math.ceil(facilityTotal / LIMIT)}</span>
                  <button onClick={() => setFacilityPage(p => p + 1)} disabled={facilityPage >= Math.ceil(facilityTotal / LIMIT)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Tiếp →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ ADMIN MODAL ══════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 flex justify-between items-center p-5 border-b border-gray-100 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">
                {formData.id ? "✏️ Cập Nhật Quản Trị Viên" : "➕ Tạo Quản Trị Viên Mới"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>

            <form onSubmit={handleSubmitAdmin} className="p-5 space-y-5">
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

              {formData.role === "admin" && (
                <>
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
                </>
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
