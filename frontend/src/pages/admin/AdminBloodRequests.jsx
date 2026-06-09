import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  ClipboardList, Loader2, AlertTriangle, Building, Truck, CheckCircle,
  Clock, Filter, RefreshCw, X, ChevronDown, CheckSquare, XCircle, Eye
} from "lucide-react";
import { useOutletContext } from "react-router-dom";

const STATUS_CONFIG = {
  pending:   { label: "Chờ duyệt",   color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  accepted:  { label: "Đã duyệt",    color: "bg-blue-100 text-blue-700 border-blue-200" },
  rejected:  { label: "Đã từ chối",  color: "bg-red-100 text-red-700 border-red-200" },
  completed: { label: "Hoàn thành",  color: "bg-green-100 text-green-700 border-green-200" },
};

const HANDOVER_CONFIG = {
  requested:  { label: "Mới yêu cầu",       color: "text-gray-500" },
  preparing:  { label: "Đang chuẩn bị",     color: "text-yellow-600" },
  packed:     { label: "Đã đóng gói",       color: "text-blue-600" },
  shipping:   { label: "Đang vận chuyển",   color: "text-purple-600" },
  confirmed:  { label: "Đã nhận (BV)",      color: "text-green-600" },
};

const AdminBloodRequests = () => {
  const { userData } = useOutletContext();
  const [requests, setRequests] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    hospitalId: "", labId: "", bloodType: "A+", units: 1, urgency: "normal"
  });
  const [facilities, setFacilities] = useState([]);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get("http://localhost:5000/api/admin/blood-requests", { headers });
      const sorted = [...data.requests].sort((a, b) => {
        const priority = { pending: 1, accepted: 2, completed: 3, rejected: 4 };
        return (priority[a.status] || 9) - (priority[b.status] || 9);
      });
      setRequests(sorted);
      setFiltered(sorted);

      const fRes = await axios.get("http://localhost:5000/api/admin/facilities", { headers });
      if (fRes.data.facilities) setFacilities(fRes.data.facilities);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    setFiltered(filterStatus === "all" ? requests : requests.filter(r => r.status === filterStatus));
  }, [filterStatus, requests]);

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa yêu cầu này?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/blood-request/${id}`, { headers });
      setSuccessMsg("Đã xóa thành công");
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Xóa thất bại");
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await axios.put(`http://localhost:5000/api/admin/blood-request/${formData._id}`, formData, { headers });
      } else {
        await axios.post(`http://localhost:5000/api/admin/blood-request`, formData, { headers });
      }
      setSuccessMsg(isEditing ? "Cập nhật thành công" : "Thêm mới thành công");
      setShowFormModal(false);
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi lưu dữ liệu");
    }
  };

  const openAddForm = () => {
    setIsEditing(false);
    setFormData({ hospitalId: "", labId: "", bloodType: "A+", units: 1, urgency: "normal" });
    setShowFormModal(true);
  };

  const openEditForm = (req) => {
    setIsEditing(true);
    setFormData({ ...req, hospitalId: req.hospitalId?._id || req.hospitalId, labId: req.labId?._id || req.labId });
    setShowFormModal(true);
  };

  const handleApprove = async (id) => {
    setActionLoading(id + "_approve");
    try {
      await axios.put(`http://localhost:5000/api/admin/blood-requests/${id}/approve`, {}, { headers });
      setSuccessMsg("✅ Đã duyệt yêu cầu thành công!");
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi duyệt yêu cầu");
    } finally {
      setActionLoading(null);
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal + "_reject");
    try {
      await axios.put(`http://localhost:5000/api/admin/blood-requests/${rejectModal}/reject`, { reason: rejectReason }, { headers });
      setSuccessMsg("✅ Đã từ chối yêu cầu.");
      setRejectModal(null);
      setRejectReason("");
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi từ chối yêu cầu");
    } finally {
      setActionLoading(null);
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  // Stats
  const stats = {
    pending:   requests.filter(r => r.status === "pending").length,
    accepted:  requests.filter(r => r.status === "accepted").length,
    completed: requests.filter(r => r.status === "completed").length,
    rejected:  requests.filter(r => r.status === "rejected").length,
  };

  if (userData?.role !== "superadmin" && !userData?.permissions?.includes("manage_requests")) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertTriangle size={64} className="text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Không có quyền truy cập</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-red-50">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="text-red-600" />
            Quản Lý Yêu Cầu Nhận Máu
          </h1>
          <p className="text-sm text-gray-500 mt-1">Duyệt và điều phối các yêu cầu máu từ bệnh viện.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchRequests} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-all">
            <RefreshCw size={16} /> Làm mới
          </button>
          <button onClick={openAddForm} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-white hover:bg-red-700 transition-colors">
            <span>+ Thêm mới</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: "pending",   label: "Chờ Duyệt",  color: "bg-yellow-500", textColor: "text-yellow-600" },
          { key: "accepted",  label: "Đã Duyệt",   color: "bg-blue-500",   textColor: "text-blue-600" },
          { key: "completed", label: "Hoàn Thành", color: "bg-green-500",  textColor: "text-green-600" },
          { key: "rejected",  label: "Từ Chối",    color: "bg-red-500",    textColor: "text-red-600" },
        ].map(({ key, label, color, textColor }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
            className={`bg-white p-4 rounded-xl shadow-sm border transition-all text-left ${filterStatus === key ? "ring-2 ring-offset-1 ring-current border-transparent" : "border-gray-100 hover:shadow-md"} ${textColor}`}
          >
            <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-3`}>
              <ClipboardList size={20} className="text-white" />
            </div>
            <div className="text-2xl font-black text-gray-800">{stats[key]}</div>
            <div className="text-xs font-semibold text-gray-500 mt-1 uppercase">{label}</div>
          </button>
        ))}
      </div>

      {/* Alerts */}
      {successMsg && <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 font-medium">{successMsg}</div>}
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex justify-between"><span>{error}</span><button onClick={() => setError(null)}><X size={18}/></button></div>}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-500 flex items-center gap-1"><Filter size={14}/> Lọc:</span>
        {[["all","Tất cả"], ["pending","Chờ duyệt"], ["accepted","Đã duyệt"], ["completed","Hoàn thành"], ["rejected","Từ chối"]].map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => setFilterStatus(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === val ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {lbl}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500">{filtered.length} yêu cầu</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-red-600" size={32} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-red-50/50 text-gray-600 text-sm border-b border-red-100">
                  <th className="p-4 font-semibold">Bệnh Viện</th>
                  <th className="p-4 font-semibold">Ngân Hàng Máu</th>
                  <th className="p-4 font-semibold text-center">Nhóm Máu</th>
                  <th className="p-4 font-semibold text-center">Số Lượng</th>
                  <th className="p-4 font-semibold">Trạng Thái</th>
                  <th className="p-4 font-semibold">Tiến Độ</th>
                  <th className="p-4 font-semibold">Ngày</th>
                  <th className="p-4 font-semibold text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((req) => {
                  const sc = STATUS_CONFIG[req.status] || { label: req.status, color: "bg-gray-100 text-gray-700 border-gray-200" };
                  const hc = HANDOVER_CONFIG[req.handoverStatus] || { label: req.handoverStatus, color: "text-gray-500" };
                  return (
                    <tr key={req._id} className="hover:bg-red-50/20 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-gray-800 flex items-center gap-2 text-sm">
                          <Building size={14} className="text-blue-500 shrink-0"/> {req.hospitalId?.name || "N/A"}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <Building size={14} className="text-red-500 shrink-0"/> {req.labId?.name || "N/A"}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 text-sm">{req.bloodType}</span>
                      </td>
                      <td className="p-4 text-center font-bold text-gray-700">{req.units} đ.v</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${sc.color}`}>{sc.label}</span>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-medium flex items-center gap-1 ${hc.color}`}>
                          {req.handoverStatus === "shipping" && <Truck size={12}/>}
                          {req.handoverStatus === "confirmed" && <CheckCircle size={12}/>}
                          {hc.label}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-gray-500">
                        {new Date(req.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="p-4">
                        {req.status === "pending" ? (
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              onClick={() => handleApprove(req._id)}
                              disabled={actionLoading === req._id + "_approve"}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-60"
                            >
                              {actionLoading === req._id + "_approve" ? <Loader2 size={12} className="animate-spin"/> : <CheckSquare size={12}/>}
                            </button>
                            <button
                              onClick={() => setRejectModal(req._id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all"
                            >
                              <XCircle size={12}/>
                            </button>
                            <button onClick={() => openEditForm(req)} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs">Sửa</button>
                            <button onClick={() => handleDelete(req._id)} className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs"><X size={12}/></button>
                          </div>
                        ) : (
                          <div className="flex justify-center gap-2">
                            <button onClick={() => openEditForm(req)} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs">Sửa</button>
                            <button onClick={() => handleDelete(req._id)} className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs"><X size={12}/></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan="8" className="p-8 text-center text-gray-500">Không có dữ liệu.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
              <XCircle className="text-red-500"/> Xác nhận Từ chối Yêu cầu
            </h3>
            <p className="text-sm text-gray-500 mb-4">Vui lòng nhập lý do từ chối để thông báo cho Bệnh viện.</p>
            <textarea
              rows={3}
              placeholder="Lý do từ chối..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-red-400 outline-none"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm">Hủy</button>
              <button
                onClick={handleReject}
                disabled={actionLoading?.includes("_reject")}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm disabled:opacity-60"
              >
                {actionLoading?.includes("_reject") ? "Đang xử lý..." : "Xác nhận Từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    {/* Form Modal Thêm/Sửa */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-bold">{isEditing ? "Sửa Yêu cầu" : "Thêm Yêu cầu"}</h3>
              <button onClick={() => setShowFormModal(false)}><X className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Bệnh viện yêu cầu *</label>
                  <select required value={formData.hospitalId} onChange={e => setFormData({...formData, hospitalId: e.target.value})} className="w-full border p-2 rounded">
                    <option value="">Chọn bệnh viện</option>
                    {facilities.filter(f => f.facilityType === "hospital").map(f => (
                      <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Trung tâm máu (Nhận) *</label>
                  <select required value={formData.labId} onChange={e => setFormData({...formData, labId: e.target.value})} className="w-full border p-2 rounded">
                    <option value="">Chọn trung tâm máu</option>
                    {facilities.filter(f => f.facilityType === "blood-lab").map(f => (
                      <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nhóm máu *</label>
                  <select value={formData.bloodType} onChange={e => setFormData({...formData, bloodType: e.target.value})} className="w-full border p-2 rounded">
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Số lượng (đơn vị) *</label>
                  <input type="number" required min="1" value={formData.units} onChange={e => setFormData({...formData, units: e.target.value})} className="w-full border p-2 rounded" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Mức độ khẩn cấp</label>
                  <select value={formData.urgency} onChange={e => setFormData({...formData, urgency: e.target.value})} className="w-full border p-2 rounded">
                    <option value="normal">Bình thường</option>
                    <option value="urgent">Khẩn cấp</option>
                    <option value="critical">Cực kỳ khẩn cấp (Critical)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBloodRequests;
