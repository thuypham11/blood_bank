import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Bell, Send, Loader2, AlertTriangle, Users, Building2,
  CheckCircle, Clock, X, MessageSquare, ChevronLeft, ChevronRight
} from "lucide-react";
import { useOutletContext } from "react-router-dom";

const TYPE_OPTIONS = [
  { value: "info",     label: "📢 Thông Báo Thường",    color: "bg-blue-100 text-blue-700" },
  { value: "warning",  label: "⚠️ Cảnh Báo",            color: "bg-yellow-100 text-yellow-700" },
  { value: "urgent",   label: "🚨 Khẩn Cấp - Cần Máu!", color: "bg-red-100 text-red-700" },
  { value: "reminder", label: "🔔 Nhắc Nhở",            color: "bg-purple-100 text-purple-700" },
];

const AdminNotifications = () => {
  const { userData } = useOutletContext();
  const [activeTab, setActiveTab] = useState("send");
  const [form, setForm] = useState({ title: "", message: "", type: "info", recipientType: "Donor" });
  const [isSending, setIsSending]   = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError]           = useState(null);
  const [history, setHistory]       = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const token   = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const { data } = await axios.get(`http://localhost:5000/api/admin/notifications/history?page=${page}&limit=15`, { headers });
      setHistory(data.notifications);
      setPagination({ page, totalPages: data.totalPages, total: data.total });
    } catch (_) {}
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { if (activeTab === "history") fetchHistory(pagination.page); }, [activeTab, pagination.page]);

  const handleSend = async (e) => {
    e.preventDefault();
    setIsSending(true);
    try {
      await axios.post("http://localhost:5000/api/admin/notifications/broadcast", form, { headers });
      setSuccessMsg(`✅ Đã gửi thành công thông báo "${form.title}" đến ${form.recipientType === "Donor" ? "tất cả người hiến máu" : "tất cả cơ sở y tế"}!`);
      setForm({ title: "", message: "", type: "info", recipientType: "Donor" });
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi gửi thông báo");
    } finally {
      setIsSending(false);
      setTimeout(() => setSuccessMsg(""), 5000);
    }
  };

  if (userData?.role !== "superadmin") {
    return <div className="flex flex-col items-center justify-center h-96"><AlertTriangle size={64} className="text-red-400 mb-4"/><h2 className="text-2xl font-bold">Không có quyền truy cập</h2></div>;
  }

  const selectedType = TYPE_OPTIONS.find(t => t.value === form.type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-50">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Bell className="text-red-600"/> Quản Lý Thông Báo Hệ Thống</h1>
        <p className="text-sm text-gray-500 mt-1">Gửi thông báo khẩn cấp hoặc thông tin đến toàn bộ người dùng.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab("send")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === "send" ? "bg-red-600 text-white shadow-md" : "bg-white text-gray-600 border border-gray-200 hover:border-red-200"}`}>
          <Send size={16}/> Gửi Thông Báo
        </button>
        <button onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === "history" ? "bg-red-600 text-white shadow-md" : "bg-white text-gray-600 border border-gray-200 hover:border-red-200"}`}>
          <Clock size={16}/> Lịch Sử ({pagination.total})
        </button>
      </div>

      {/* Send Tab */}
      {activeTab === "send" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-red-50 p-6">
            <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2"><MessageSquare size={18} className="text-red-500"/> Soạn Thông Báo</h2>

            {successMsg && <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 flex justify-between items-start"><span>{successMsg}</span><button onClick={() => setSuccessMsg("")}><X size={16}/></button></div>}
            {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex justify-between"><span>{error}</span><button onClick={() => setError(null)}><X size={18}/></button></div>}

            <form onSubmit={handleSend} className="space-y-4">
              {/* Recipient */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Đối Tượng Nhận *</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.recipientType === "Donor" ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="recipientType" value="Donor" checked={form.recipientType === "Donor"} onChange={e => setForm(f => ({...f, recipientType: e.target.value}))} className="text-red-600"/>
                    <div><div className="flex items-center gap-1 font-semibold text-sm text-gray-800"><Users size={14} className="text-red-500"/> Người Hiến Máu</div><div className="text-[10px] text-gray-500">Tất cả Donor</div></div>
                  </label>
                  <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.recipientType === "Facility" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="recipientType" value="Facility" checked={form.recipientType === "Facility"} onChange={e => setForm(f => ({...f, recipientType: e.target.value}))} className="text-blue-600"/>
                    <div><div className="flex items-center gap-1 font-semibold text-sm text-gray-800"><Building2 size={14} className="text-blue-500"/> Cơ Sở Y Tế</div><div className="text-[10px] text-gray-500">Lab + Bệnh viện</div></div>
                  </label>
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Loại Thông Báo *</label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map(t => (
                    <label key={t.value} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm ${form.type === t.value ? "border-gray-400 bg-gray-50 font-semibold" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="type" value={t.value} checked={form.type === t.value} onChange={e => setForm(f => ({...f, type: e.target.value}))} className="hidden"/>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${t.color}`}>{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tiêu Đề *</label>
                <input required placeholder="VD: Khẩn cấp cần máu nhóm O-" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none"/>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nội Dung *</label>
                <textarea required rows={5} placeholder="Nhập nội dung thông báo chi tiết..." value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400 outline-none resize-none"/>
                <div className="text-xs text-gray-400 mt-1 text-right">{form.message.length} ký tự</div>
              </div>

              <button type="submit" disabled={isSending}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-lg shadow-red-200">
                {isSending ? <><Loader2 size={18} className="animate-spin"/> Đang gửi...</> : <><Send size={18}/> Gửi Thông Báo Ngay</>}
              </button>
            </form>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-700 mb-3 text-sm">📱 Xem Trước Thông Báo</h3>
              <div className={`p-4 rounded-xl border ${form.type === "urgent" ? "border-red-200 bg-red-50" : form.type === "warning" ? "border-yellow-200 bg-yellow-50" : "border-blue-200 bg-blue-50"}`}>
                <div className="flex items-start gap-2">
                  <Bell size={16} className={form.type === "urgent" ? "text-red-500 mt-0.5" : form.type === "warning" ? "text-yellow-500 mt-0.5" : "text-blue-500 mt-0.5"}/>
                  <div>
                    <div className="font-bold text-sm text-gray-800">{form.title || "Tiêu đề thông báo"}</div>
                    <div className="text-xs text-gray-600 mt-1 leading-relaxed">{form.message || "Nội dung thông báo sẽ xuất hiện ở đây..."}</div>
                    {selectedType && <div className={`mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold ${selectedType.color}`}>{selectedType.label}</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick templates */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-700 mb-3 text-sm">⚡ Mẫu Thông Báo Nhanh</h3>
              <div className="space-y-2">
                {[
                  { title: "Khẩn cấp thiếu máu O-", msg: "Hệ thống hiện đang thiếu máu nhóm O- nghiêm trọng. Kêu gọi tất cả người có nhóm máu O- đến hiến máu ngay!", type: "urgent" },
                  { title: "Lịch hiến máu sắp tới", msg: "Chiến dịch hiến máu sắp diễn ra tại Nhà Văn hóa Thanh niên. Hãy đăng ký tham gia!", type: "info" },
                  { title: "Cảm ơn người hiến máu", msg: "Chân thành cảm ơn tất cả các mạnh thường quân đã tham gia hiến máu trong tháng vừa qua!", type: "reminder" },
                ].map((tpl, i) => (
                  <button key={i} onClick={() => setForm(f => ({...f, title: tpl.title, message: tpl.msg, type: tpl.type}))}
                    className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50/30 transition-all">
                    <div className="font-semibold text-xs text-gray-800">{tpl.title}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 truncate">{tpl.msg.substring(0, 60)}...</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl shadow-sm border border-red-50 overflow-hidden">
          {historyLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-red-600" size={32}/></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead><tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100">
                    <th className="p-4 font-semibold">Tiêu Đề</th>
                    <th className="p-4 font-semibold">Nội Dung</th>
                    <th className="p-4 font-semibold text-center">Loại</th>
                    <th className="p-4 font-semibold text-center">Đối Tượng</th>
                    <th className="p-4 font-semibold text-right">Ngày Gửi</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map(n => {
                      const tc = TYPE_OPTIONS.find(t => t.value === n.type) || { label: n.type, color: "bg-gray-100 text-gray-700" };
                      return (
                        <tr key={n._id} className="hover:bg-gray-50/50 text-sm">
                          <td className="p-4 font-semibold text-gray-800 max-w-[180px] truncate">{n.title}</td>
                          <td className="p-4 text-xs text-gray-500 max-w-[250px] truncate">{n.message}</td>
                          <td className="p-4 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tc.color}`}>{tc.label}</span></td>
                          <td className="p-4 text-center text-xs text-gray-600">{n.recipient?.userType || "Tất cả"}</td>
                          <td className="p-4 text-right text-xs text-gray-400">{new Date(n.createdAt).toLocaleString("vi-VN")}</td>
                        </tr>
                      );
                    })}
                    {history.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">Chưa có thông báo nào được gửi.</td></tr>}
                  </tbody>
                </table>
              </div>
              {pagination.totalPages > 1 && (
                <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <button onClick={() => setPagination(p => ({...p, page: p.page - 1}))} disabled={pagination.page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                    <ChevronLeft size={16}/> Trước
                  </button>
                  <span className="text-sm text-gray-500">{pagination.page} / {pagination.totalPages}</span>
                  <button onClick={() => setPagination(p => ({...p, page: p.page + 1}))} disabled={pagination.page === pagination.totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                    Sau <ChevronRight size={16}/>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;
