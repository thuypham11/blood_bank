import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Droplet, Loader2, AlertTriangle, Building, Clock, TestTube, Filter,
  Plus, Download, X, ChevronLeft, ChevronRight, Search, RefreshCw, CheckCircle
} from "lucide-react";
import { useOutletContext } from "react-router-dom";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const STATUS_OPTS = ["available", "pending_testing", "used", "expired", "rejected"];

const AdminBloodStock = () => {
  const { userData } = useOutletContext();
  const [stockStats, setStockStats] = useState([]);
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [units, setUnits] = useState([]);
  const [totalUnits, setTotalUnits] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [labs, setLabs] = useState([]);

  const [filters, setFilters] = useState({ bloodGroup: "", status: "", page: 1, limit: 15 });
  const [addForm, setAddForm] = useState({ bloodGroup: "A+", quantity: 250, bloodLab: "", collectionDate: "" });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get("http://localhost:5000/api/admin/blood-stock", { headers });
      setStockStats(data.stock);
      setExpiringSoon(data.expiringSoon);
    } catch (err) { setError(err.response?.data?.message || "Lỗi tải kho máu"); }
    finally { setIsLoading(false); }
  }, []);

  const fetchUnits = useCallback(async () => {
    setUnitsLoading(true);
    try {
      const params = new URLSearchParams({ ...filters });
      const { data } = await axios.get(`http://localhost:5000/api/admin/blood-stock/units?${params}`, { headers });
      setUnits(data.units);
      setTotalUnits(data.total);
      setTotalPages(data.totalPages);
    } catch (err) { console.error(err); }
    finally { setUnitsLoading(false); }
  }, [filters]);

  const fetchLabs = useCallback(async () => {
    try {
      const { data } = await axios.get("http://localhost:5000/api/admin/facilities", { headers });
      setLabs(data.facilities.filter(f => f.facilityType === "blood-lab"));
    } catch (_) { }
  }, []);

  useEffect(() => { fetchOverview(); fetchLabs(); }, []);
  useEffect(() => { fetchUnits(); }, [fetchUnits]);

  const handleAddUnit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/admin/blood-stock/add", addForm, { headers });
      setSuccessMsg("✅ Đã thêm đơn vị máu vào kho!");
      setShowAddModal(false);
      setAddForm({ bloodGroup: "A+", quantity: 250, bloodLab: "", collectionDate: "" });
      fetchOverview(); fetchUnits();
    } catch (err) { setError(err.response?.data?.message || "Lỗi thêm đơn vị"); }
    finally { setTimeout(() => setSuccessMsg(""), 3000); }
  };

  const handleExportCSV = () => {
    let csv = "data:text/csv;charset=utf-8,\uFEFF";
    csv += "Mã Vạch,Nhóm Máu,Thể Tích (ml),Kho Lưu Trữ,Trạng Thái,Ngày Thu Thập,Ngày Hết Hạn\n";
    units.forEach(u => {
      csv += `"${u.barcode || u._id}","${u.bloodGroup}","${u.quantity}","${u.bloodLab?.name || ""}","${u.status}","${new Date(u.collectionDate).toLocaleDateString("vi-VN")}","${u.expiryDate ? new Date(u.expiryDate).toLocaleDateString("vi-VN") : ""}"\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `blood_stock_${Date.now()}.csv`);
    link.click();
  };

  // Group overview by blood type
  const groupedStock = stockStats.reduce((acc, curr) => {
    const bg = curr._id.group;
    if (!acc[bg]) acc[bg] = { available: 0, pending: 0, used: 0, expired: 0, rejected: 0 };
    if (curr._id.status === "available") acc[bg].available += curr.count;
    if (curr._id.status === "pending_testing") acc[bg].pending += curr.count;
    if (curr._id.status === "used") acc[bg].used += curr.count;
    if (curr._id.status === "expired") acc[bg].expired += curr.count;
    if (curr._id.status === "rejected") acc[bg].rejected += curr.count;
    return acc;
  }, {});

  const statusBadge = (s) => {
    const cfg = {
      available: "bg-green-100 text-green-700",
      pending_testing: "bg-yellow-100 text-yellow-700",
      used: "bg-gray-100 text-gray-600",
      expired: "bg-red-100 text-red-700",
      rejected: "bg-red-100 text-red-800",
    };
    const lbl = { available: "Sẵn sàng", pending_testing: "Xét nghiệm", used: "Đã dùng", expired: "Hết hạn", rejected: "Bị hủy" };
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cfg[s] || "bg-gray-100 text-gray-600"}`}>{lbl[s] || s}</span>;
  };

  if (userData?.role !== "superadmin" && !userData?.permissions?.includes("manage_blood_stock")) {
    return <div className="flex flex-col items-center justify-center h-96"><AlertTriangle size={64} className="text-red-400 mb-4" /><h2 className="text-2xl font-bold text-gray-800">Không có quyền truy cập</h2></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-red-50">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Droplet className="text-red-600 fill-red-600" /> Quản Lý Kho Máu Toàn Cục</h1>
          <p className="text-sm text-gray-500 mt-1">Theo dõi tồn kho, cảnh báo hết hạn và nhập kho.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchOverview} className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700"><RefreshCw size={14} /></button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all">
            <Plus size={16} /> Nhập Kho Mới
          </button>
        </div>
      </div>

      {successMsg && <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100">{successMsg}</div>}
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex justify-between"><span>{error}</span><button onClick={() => setError(null)}><X size={18} /></button></div>}

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-red-600" size={32} /></div>
      ) : (
        <>
          {/* Blood Group Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {BLOOD_GROUPS.map(bg => {
              const stats = groupedStock[bg] || { available: 0, pending: 0 };
              const isLow = stats.available < 5;
              return (
                <button key={bg} onClick={() => setFilters(f => ({ ...f, bloodGroup: f.bloodGroup === bg ? "" : bg, page: 1 }))}
                  className={`p-4 rounded-xl border text-center transition-all hover:shadow-md ${filters.bloodGroup === bg ? "border-red-500 bg-red-50 shadow-md" :
                    isLow ? "border-red-200 bg-red-50" : "border-gray-100 bg-white"
                    }`}
                >
                  <div className={`text-lg font-bold ${isLow ? "text-red-600" : "text-gray-800"}`}>{bg}</div>
                  <div className="text-2xl font-black mt-1 text-gray-900">{stats.available}</div>
                  <div className="text-[9px] text-gray-500 uppercase font-semibold mt-0.5">Khả dụng</div>
                  {isLow && <div className="mt-1 text-[9px] font-bold text-red-500 bg-red-100 rounded px-1">⚠ Thấp</div>}
                </button>
              );
            })}
          </div>

          {/* Expiring Soon Alert */}
          {expiringSoon.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-orange-100 flex justify-between items-center">
                <h2 className="text-base font-bold text-orange-800 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-orange-600" /> Cảnh Báo: {expiringSoon.length} Đơn Vị Sắp Hết Hạn (≤7 ngày)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="bg-orange-100/60 text-orange-700 text-xs">
                    <th className="p-3 font-semibold">Mã</th>
                    <th className="p-3 font-semibold text-center">Nhóm</th>
                    <th className="p-3 font-semibold">Kho</th>
                    <th className="p-3 font-semibold">Hết Hạn</th>
                    <th className="p-3 font-semibold text-right">Còn Lại</th>
                  </tr></thead>
                  <tbody className="divide-y divide-orange-100">
                    {expiringSoon.slice(0, 10).map(b => {
                      const expiry = new Date(b.expiryDate || b.expirationDate);
                      const diffDays = Math.ceil((expiry - new Date()) / 86400000);
                      return (
                        <tr key={b._id} className="hover:bg-orange-50/50">
                          <td className="p-3 font-mono text-xs text-gray-500">#{b._id.toString().slice(-6)}</td>
                          <td className="p-3 text-center"><span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">{b.bloodGroup}</span></td>
                          <td className="p-3 text-xs text-gray-700 flex items-center gap-1"><Building size={12} className="text-blue-400" />{b.bloodLab?.name || "N/A"}</td>
                          <td className="p-3 text-xs text-gray-600">{expiry.toLocaleDateString("vi-VN")}</td>
                          <td className="p-3 text-right"><span className={`px-2 py-1 rounded-full text-xs font-bold ${diffDays <= 3 ? "bg-red-100 text-red-700 animate-pulse" : "bg-orange-100 text-orange-700"}`}>{diffDays}d</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Units Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
              <h2 className="font-bold text-gray-800 flex items-center gap-2"><TestTube size={18} className="text-blue-500" /> Danh Sách Chi Tiết Đơn Vị Máu</h2>
              <div className="flex gap-2 ml-auto flex-wrap">
                <select value={filters.bloodGroup} onChange={e => setFilters(f => ({ ...f, bloodGroup: e.target.value, page: 1 }))}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="">Tất cả nhóm máu</option>
                  {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
                <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="">Tất cả trạng thái</option>
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={handleExportCSV} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-medium">
                  <Download size={14} /> CSV
                </button>
              </div>
            </div>

            {unitsLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100">
                    <th className="p-3 font-semibold">Mã Vạch</th>
                    <th className="p-3 font-semibold text-center">Nhóm</th>
                    <th className="p-3 font-semibold text-center">Thể Tích</th>
                    <th className="p-3 font-semibold">Kho</th>
                    <th className="p-3 font-semibold text-center">Trạng Thái</th>
                    <th className="p-3 font-semibold">Thu Thập</th>
                    <th className="p-3 font-semibold">Hết Hạn</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {units.map(u => {
                      const expiryDate = u.expiryDate || u.expirationDate;
                      const isExpiringSoon = expiryDate && new Date(expiryDate) <= new Date(Date.now() + 7 * 86400000);
                      return (
                        <tr key={u._id} className={`hover:bg-gray-50 transition-colors text-sm ${isExpiringSoon && u.status === "available" ? "bg-orange-50/30" : ""}`}>
                          <td className="p-3 font-mono text-xs text-gray-500">{u.barcode || u._id.toString().slice(-8)}</td>
                          <td className="p-3 text-center"><span className="font-bold text-red-600 text-sm">{u.bloodGroup}</span></td>
                          <td className="p-3 text-center text-gray-700">{u.quantity}ml</td>
                          <td className="p-3 text-xs text-gray-600 flex items-center gap-1"><Building size={11} className="text-blue-400" />{u.bloodLab?.name || "N/A"}</td>
                          <td className="p-3 text-center">{statusBadge(u.status)}</td>
                          <td className="p-3 text-xs text-gray-500">{u.collectionDate ? new Date(u.collectionDate).toLocaleDateString("vi-VN") : "—"}</td>
                          <td className="p-3 text-xs">
                            {expiryDate ? (
                              <span className={isExpiringSoon ? "text-red-600 font-semibold" : "text-gray-500"}>
                                {new Date(expiryDate).toLocaleDateString("vi-VN")}
                              </span>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {units.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-gray-400">Không có đơn vị máu nào.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
                <button onClick={() => setFilters(f => ({ ...f, page: Math.max(1, f.page - 1) }))} disabled={filters.page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  <ChevronLeft size={16} /> Trước
                </button>
                <span className="text-sm text-gray-500">{filters.page} / {totalPages} — {totalUnits} đơn vị</span>
                <button onClick={() => setFilters(f => ({ ...f, page: Math.min(totalPages, f.page + 1) }))} disabled={filters.page === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  Sau <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2"><Plus className="text-red-600" /> Nhập Kho Đơn Vị Máu Mới</h3>
            <form onSubmit={handleAddUnit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nhóm Máu *</label>
                <select required value={addForm.bloodGroup} onChange={e => setAddForm(f => ({ ...f, bloodGroup: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400 outline-none text-sm">
                  {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Thể Tích (ml) *</label>
                <input type="number" min="100" max="500" required value={addForm.quantity}
                  onChange={e => setAddForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Kho Lưu Trữ *</label>
                <select required value={addForm.bloodLab} onChange={e => setAddForm(f => ({ ...f, bloodLab: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400 outline-none text-sm">
                  <option value="">-- Chọn Lab --</option>
                  {labs.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày Thu Thập</label>
                <input type="date" value={addForm.collectionDate} onChange={e => setAddForm(f => ({ ...f, collectionDate: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400 outline-none text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm">Hủy</button>
                <button type="submit" className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm">Nhập Kho</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBloodStock;
