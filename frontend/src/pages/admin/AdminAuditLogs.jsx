import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Shield, Loader2, Clock, ChevronLeft, ChevronRight, AlertTriangle,
  Filter, Download, Search, X
} from "lucide-react";
import { useOutletContext } from "react-router-dom";

const ACTION_COLORS = {
  APPROVE_FACILITY:      "bg-green-100 text-green-700 border-green-200",
  REJECT_FACILITY:       "bg-red-100 text-red-700 border-red-200",
  APPROVE_BLOOD_REQUEST: "bg-blue-100 text-blue-700 border-blue-200",
  REJECT_BLOOD_REQUEST:  "bg-red-100 text-red-700 border-red-200",
  CREATE_BLOOD_CAMP:     "bg-purple-100 text-purple-700 border-purple-200",
  ADD_BLOOD_UNIT:        "bg-teal-100 text-teal-700 border-teal-200",
  NEW_BLOOD_REQUEST:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  DEFAULT:               "bg-gray-100 text-gray-700 border-gray-200",
};

const AdminAuditLogs = () => {
  const { userData } = useOutletContext();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState(null);
  const [searchText, setSearchText] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const token   = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(
        `http://localhost:5000/api/admin/audit-logs?page=${page}&limit=25`,
        { headers }
      );
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi tải nhật ký hệ thống");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(pagination.page); }, [pagination.page]);

  const handleExportCSV = () => {
    let csv = "data:text/csv;charset=utf-8,\uFEFF";
    csv += "Thời Gian,Loại Người Dùng,Tên,Hành Động,Mô Tả,IP Address\n";
    logs.forEach(log => {
      csv += `"${new Date(log.createdAt).toLocaleString("vi-VN")}","${log.performedBy?.userType}","${log.performedBy?.name}","${log.action}","${log.description}","${log.ipAddress || ""}"\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `audit_logs_${Date.now()}.csv`);
    link.click();
  };

  const filteredLogs = logs.filter(log => {
    const matchSearch = searchText === "" ||
      log.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      log.performedBy?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchText.toLowerCase());
    const matchAction = filterAction === "" || log.action === filterAction;
    return matchSearch && matchAction;
  });

  const uniqueActions = [...new Set(logs.map(l => l.action))];

  if (userData?.role !== "superadmin") {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertTriangle size={64} className="text-red-400 mb-4"/>
        <h2 className="text-2xl font-bold text-gray-800">Không có quyền truy cập</h2>
        <p className="text-gray-500 mt-2">Chỉ Superadmin mới được xem Audit Logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-red-50">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Shield className="text-red-600"/> Nhật Ký Hệ Thống (Audit Logs)</h1>
          <p className="text-sm text-gray-500 mt-1">Theo dõi tất cả các hành động quan trọng trong hệ thống.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-gray-500 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
            Tổng: <span className="font-bold text-gray-800">{pagination.total}</span> bản ghi
          </div>
          <button onClick={handleExportCSV} className="flex items-center gap-1 px-3 py-2 bg-gray-800 text-white rounded-xl text-xs font-medium">
            <Download size={14}/> CSV
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex justify-between"><span>{error}</span><button onClick={() => setError(null)}><X size={18}/></button></div>}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <Search size={14} className="text-gray-400"/>
          <input placeholder="Tìm kiếm hành động, tên..." value={searchText} onChange={e => setSearchText(e.target.value)}
            className="bg-transparent text-sm outline-none flex-1 text-gray-700 placeholder:text-gray-400"/>
        </div>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none text-gray-700">
          <option value="">Tất cả hành động</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {(searchText || filterAction) && (
          <button onClick={() => { setSearchText(""); setFilterAction(""); }}
            className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
            <X size={12}/> Xóa lọc
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{filteredLogs.length} bản ghi</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-50 overflow-hidden">
        {isLoading && logs.length === 0 ? (
          <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-red-600" size={32}/></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs border-b border-gray-100">
                    <th className="p-4 font-semibold w-44">Thời Gian</th>
                    <th className="p-4 font-semibold w-40">Thực Hiện Bởi</th>
                    <th className="p-4 font-semibold">Hành Động</th>
                    <th className="p-4 font-semibold">Mô Tả</th>
                    <th className="p-4 font-semibold w-28 text-right">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.map((log) => {
                    const actionColor = ACTION_COLORS[log.action] || ACTION_COLORS.DEFAULT;
                    return (
                      <tr key={log._id} className="hover:bg-gray-50/50 transition-colors text-sm">
                        <td className="p-4 text-gray-500 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-xs"><Clock size={12}/>{new Date(log.createdAt).toLocaleTimeString("vi-VN")}</div>
                          <div className="text-[10px] mt-0.5 text-gray-400">{new Date(log.createdAt).toLocaleDateString("vi-VN")}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            log.performedBy?.userType === "Admin"    ? "bg-purple-100 text-purple-700 border-purple-200" :
                            log.performedBy?.userType === "Facility" ? "bg-blue-100 text-blue-700 border-blue-200" :
                            "bg-gray-100 text-gray-700 border-gray-200"
                          }`}>{log.performedBy?.userType || "System"}</span>
                          <div className="text-xs text-gray-600 mt-1 truncate max-w-[130px]" title={log.performedBy?.name}>
                            {log.performedBy?.name || "System"}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold border ${actionColor}`}>{log.action}</span>
                        </td>
                        <td className="p-4 text-xs text-gray-500 max-w-[280px] truncate" title={log.description}>
                          {log.description}
                        </td>
                        <td className="p-4 text-right font-mono text-[10px] text-gray-400">{log.ipAddress || "N/A"}</td>
                      </tr>
                    );
                  })}
                  {filteredLogs.length === 0 && (
                    <tr><td colSpan="5" className="p-8 text-center text-gray-400">Không tìm thấy bản ghi nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft size={16}/> Trước
                </button>
                <span className="text-sm text-gray-600">
                  Trang <span className="font-bold">{pagination.page}</span> / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Sau <ChevronRight size={16}/>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;
