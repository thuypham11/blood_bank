import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  CalendarDays, Loader2, AlertTriangle, MapPin, Users, CheckCircle,
  Clock, Plus, RefreshCw, X, Edit3
} from "lucide-react";
import { useOutletContext } from "react-router-dom";

const CAMP_STATUSES = ["Upcoming", "Ongoing", "Completed", "Cancelled"];

const AdminBloodCamps = () => {
  const { userData } = useOutletContext();
  const [camps, setCamps]           = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [labs, setLabs]             = useState([]);
  const [statusModal, setStatusModal] = useState(null);

  const [form, setForm] = useState({
    title: "", date: "", timeStart: "", timeEnd: "",
    venue: "", address: "", city: "", state: "",
    hospital: "", expectedDonors: 100, description: ""
  });

  const token   = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchCamps = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get("http://localhost:5000/api/admin/camps", { headers });
      setCamps(data.camps);
    } catch (err) { setError(err.response?.data?.message || "Lỗi tải dữ liệu chiến dịch"); }
    finally { setIsLoading(false); }
  }, []);

  const fetchLabs = useCallback(async () => {
    try {
      const { data } = await axios.get("http://localhost:5000/api/admin/facilities", { headers });
      setLabs(data.facilities);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchCamps(); fetchLabs(); }, []);
  useEffect(() => {
    setFiltered(filterStatus === "all" ? camps : camps.filter(c => c.status === filterStatus));
  }, [filterStatus, camps]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/admin/camps", {
        title: form.title,
        date: form.date,
        time: { start: form.timeStart, end: form.timeEnd },
        location: { venue: form.venue, address: form.address, city: form.city, state: form.state },
        hospital: form.hospital,
        expectedDonors: Number(form.expectedDonors),
        description: form.description
      }, { headers });
      setSuccessMsg("✅ Đã tạo chiến dịch hiến máu mới!");
      setShowCreateModal(false);
      setForm({ title: "", date: "", timeStart: "", timeEnd: "", venue: "", address: "", city: "", state: "", hospital: "", expectedDonors: 100, description: "" });
      fetchCamps();
    } catch (err) { setError(err.response?.data?.message || "Lỗi tạo chiến dịch"); }
    finally { setTimeout(() => setSuccessMsg(""), 3000); }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await axios.put(`http://localhost:5000/api/admin/camps/${id}/status`, { status }, { headers });
      setSuccessMsg(`✅ Đã cập nhật trạng thái thành "${status}"`);
      setStatusModal(null);
      fetchCamps();
    } catch (err) { setError("Lỗi cập nhật trạng thái"); }
    finally { setTimeout(() => setSuccessMsg(""), 3000); }
  };

  const stats = {
    total: camps.length,
    upcoming: camps.filter(c => c.status === "Upcoming").length,
    ongoing:  camps.filter(c => c.status === "Ongoing").length,
    completed:camps.filter(c => c.status === "Completed").length,
  };

  if (userData?.role !== "superadmin" && !userData?.permissions?.includes("manage_blood_camps")) {
    return <div className="flex flex-col items-center justify-center h-96"><AlertTriangle size={64} className="text-red-400 mb-4"/><h2 className="text-2xl font-bold">Không có quyền truy cập</h2></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-red-50">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><CalendarDays className="text-red-600"/> Quản Lý Chiến Dịch Hiến Máu</h1>
          <p className="text-sm text-gray-500 mt-1">Lập kế hoạch và quản lý các đợt hiến máu lưu động.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchCamps} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600"><RefreshCw size={16}/></button>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold">
            <Plus size={16}/> Tạo Chiến Dịch
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Tổng", val: stats.total,     color: "bg-gray-800",  icon: CalendarDays },
          { label: "Sắp tới",val: stats.upcoming, color: "bg-blue-500",  icon: Clock },
          { label: "Đang diễn ra", val: stats.ongoing, color: "bg-yellow-500", icon: Users },
          { label: "Hoàn thành",   val: stats.completed, color: "bg-green-500", icon: CheckCircle },
        ].map(({ label, val, color, icon: Icon }) => (
          <div key={label} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-3`}><Icon size={18} className="text-white"/></div>
            <div className="text-2xl font-black text-gray-800">{val}</div>
            <div className="text-xs text-gray-500 font-semibold uppercase mt-1">{label}</div>
          </div>
        ))}
      </div>

      {successMsg && <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100">{successMsg}</div>}
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex justify-between"><span>{error}</span><button onClick={() => setError(null)}><X size={18}/></button></div>}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[["all", "Tất cả"], ["Upcoming", "Sắp tới"], ["Ongoing", "Đang diễn ra"], ["Completed", "Hoàn thành"], ["Cancelled", "Đã huỷ"]].map(([val, lbl]) => (
          <button key={val} onClick={() => setFilterStatus(val)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filterStatus === val ? "bg-red-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-red-300"}`}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-50 overflow-hidden">
        {isLoading ? <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-red-600" size={32}/></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                  <th className="p-4 font-semibold">Tên Chiến Dịch</th>
                  <th className="p-4 font-semibold">Đơn Vị Tổ Chức</th>
                  <th className="p-4 font-semibold">Thời Gian & Địa Điểm</th>
                  <th className="p-4 font-semibold text-center">Trạng Thái</th>
                  <th className="p-4 font-semibold text-right">Dự Kiến</th>
                  <th className="p-4 font-semibold text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(camp => (
                  <tr key={camp._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-gray-800 text-sm">{camp.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{camp.description}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{camp.organizer?.name || "N/A"}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-xs text-gray-600 mb-1"><Clock size={11} className="text-blue-400"/>{new Date(camp.date).toLocaleDateString("vi-VN")}</div>
                      <div className="flex items-start gap-1 text-xs text-gray-500">
                        <MapPin size={11} className="text-red-400 mt-0.5 shrink-0"/>
                        <span className="truncate max-w-[180px]">{camp.location?.venue}, {camp.location?.city}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        camp.status === "Upcoming"  ? "bg-blue-100 text-blue-700"   :
                        camp.status === "Ongoing"   ? "bg-yellow-100 text-yellow-700" :
                        camp.status === "Completed" ? "bg-green-100 text-green-700"  :
                        "bg-gray-100 text-gray-600"
                      }`}>{camp.status}</span>
                    </td>
                    <td className="p-4 text-right font-bold text-gray-700 text-sm">
                      <div className="flex items-center justify-end gap-1"><Users size={13} className="text-gray-400"/>{camp.expectedDonors}</div>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => setStatusModal(camp)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium mx-auto">
                        <Edit3 size={12}/> Cập Nhật
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-400">Chưa có chiến dịch nào.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2"><Plus className="text-red-600"/> Tạo Chiến Dịch Hiến Máu Mới</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Chiến Dịch *</label>
                <input required placeholder="VD: Lễ hội Xuân Hồng 2026" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày Tổ Chức *</label>
                  <input type="date" required value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ bắt đầu</label>
                  <input type="time" value={form.timeStart} onChange={e => setForm(f => ({...f, timeStart: e.target.value}))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Địa Điểm (Venue) *</label>
                <input required placeholder="VD: Nhà Văn hóa Thanh niên" value={form.venue} onChange={e => setForm(f => ({...f, venue: e.target.value}))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thành Phố *</label>
                  <input required placeholder="VD: Hồ Chí Minh" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn Vị Tổ Chức *</label>
                  <select required value={form.hospital} onChange={e => setForm(f => ({...f, hospital: e.target.value}))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none">
                    <option value="">-- Chọn --</option>
                    {labs.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số Người Hiến Dự Kiến</label>
                <input type="number" min="1" value={form.expectedDonors} onChange={e => setForm(f => ({...f, expectedDonors: e.target.value}))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô Tả</label>
                <textarea rows={2} placeholder="Thông tin thêm về chiến dịch..." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none resize-none"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm">Hủy</button>
                <button type="submit" className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm">Tạo Chiến Dịch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2"><Edit3 className="inline mr-2 text-blue-500" size={18}/>Cập Nhật Trạng Thái</h3>
            <p className="text-sm text-gray-500 mb-5">Chiến dịch: <strong>{statusModal.title}</strong></p>
            <div className="space-y-2">
              {CAMP_STATUSES.map(s => (
                <button key={s} onClick={() => handleUpdateStatus(statusModal._id, s)}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm text-left px-4 transition-all border ${
                    statusModal.status === s ? "bg-red-600 text-white border-red-600" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}>
                  {statusModal.status === s && "✓ "}{s === "Upcoming" ? "⏰ Sắp tới" : s === "Ongoing" ? "🔴 Đang diễn ra" : s === "Completed" ? "✅ Hoàn thành" : "❌ Đã huỷ"}
                </button>
              ))}
            </div>
            <button onClick={() => setStatusModal(null)} className="w-full mt-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm">Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBloodCamps;
