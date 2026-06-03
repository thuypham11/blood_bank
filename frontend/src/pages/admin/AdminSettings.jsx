import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Settings, Database, Shield, Loader2, AlertTriangle, CheckCircle,
  HardDrive, Clock, Download, RefreshCw, X, Folder, AlertCircle
} from "lucide-react";
import { useOutletContext } from "react-router-dom";

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const AdminSettings = () => {
  const { userData } = useOutletContext();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState(null);
  const [backups, setBackups]           = useState([]);
  const [backupsLoading, setBackupsLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [confirmBackup, setConfirmBackup] = useState(false);

  const token   = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchBackups = useCallback(async () => {
    setBackupsLoading(true);
    try {
      const { data } = await axios.get("http://localhost:5000/api/admin/backups/list", { headers });
      setBackups(data.backups);
    } catch (_) { setBackups([]); }
    finally { setBackupsLoading(false); }
  }, []);

  useEffect(() => { fetchBackups(); }, []);

  const handleBackup = async () => {
    setIsBackingUp(true);
    setError(null);
    setBackupResult(null);
    setConfirmBackup(false);
    try {
      const { data } = await axios.post("http://localhost:5000/api/admin/backup", {}, { headers });
      setBackupResult(data);
      setSuccessMsg("✅ Sao lưu cơ sở dữ liệu thành công!");
      fetchBackups();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi sao lưu dữ liệu");
    } finally {
      setIsBackingUp(false);
      setTimeout(() => setSuccessMsg(""), 5000);
    }
  };

  if (userData?.role !== "superadmin") {
    return <div className="flex flex-col items-center justify-center h-96"><AlertTriangle size={64} className="text-red-400 mb-4"/><h2 className="text-2xl font-bold">Không có quyền truy cập</h2></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-50">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Settings className="text-red-600"/> Cài Đặt & Bảo Mật Hệ Thống</h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý sao lưu dữ liệu và bảo mật hệ thống ngân hàng máu.</p>
      </div>

      {successMsg && <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 flex justify-between"><span>{successMsg}</span><button onClick={() => setSuccessMsg("")}><X size={18}/></button></div>}
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex justify-between"><span>{error}</span><button onClick={() => setError(null)}><X size={18}/></button></div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Backup Section */}
        <div className="lg:col-span-2 space-y-5">
          {/* Backup Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Database size={20} className="text-white"/>
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">Sao Lưu Cơ Sở Dữ Liệu</h2>
                  <p className="text-xs text-gray-500">Tạo bản backup MongoDB đầy đủ</p>
                </div>
              </div>
              <button onClick={() => setConfirmBackup(true)} disabled={isBackingUp}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-60 shadow-sm shadow-blue-200">
                {isBackingUp ? <><Loader2 size={16} className="animate-spin"/> Đang sao lưu...</> : <><HardDrive size={16}/> Sao Lưu Ngay</>}
              </button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-black text-blue-600">{backups.length}</div>
                  <div className="text-xs text-blue-600/70 font-semibold mt-1">Bản Backup</div>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <div className="text-lg font-black text-green-600">
                    {backups.length > 0 ? formatBytes(backups.reduce((s, b) => s + (b.size || 0), 0)) : "0 B"}
                  </div>
                  <div className="text-xs text-green-600/70 font-semibold mt-1">Tổng Dung Lượng</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <div className="text-sm font-bold text-purple-600">
                    {backups[0] ? new Date(backups[0].createdAt).toLocaleDateString("vi-VN") : "Chưa có"}
                  </div>
                  <div className="text-xs text-purple-600/70 font-semibold mt-1">Backup Gần Nhất</div>
                </div>
              </div>

              {backupResult && (
                <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0"/>
                  <div>
                    <div className="text-sm font-semibold text-green-700">Sao lưu thành công!</div>
                    <div className="text-xs text-green-600 font-mono mt-0.5 truncate">{backupResult.path}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Backup List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Folder size={18} className="text-blue-500"/> Danh Sách Bản Backup</h3>
              <button onClick={fetchBackups} className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-lg"><RefreshCw size={14}/></button>
            </div>
            {backupsLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={24}/></div>
            ) : backups.length === 0 ? (
              <div className="p-8 text-center">
                <HardDrive size={40} className="text-gray-300 mx-auto mb-3"/>
                <p className="text-gray-500 text-sm">Chưa có bản backup nào.</p>
                <p className="text-gray-400 text-xs mt-1">Nhấn "Sao Lưu Ngay" để tạo bản backup đầu tiên.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {backups.map((b, i) => (
                  <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Database size={16} className="text-blue-600"/>
                      </div>
                      <div>
                        <div className="font-mono text-xs text-gray-800 font-semibold">{b.name}</div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock size={10}/>{new Date(b.createdAt).toLocaleString("vi-VN")}</span>
                          <span className="text-[10px] text-blue-500 font-semibold">{formatBytes(b.size)}</span>
                        </div>
                      </div>
                    </div>
                    {i === 0 && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">Mới nhất</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Security & Info Panel */}
        <div className="space-y-5">
          {/* Security Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Shield size={18} className="text-green-500"/> Trạng Thái Bảo Mật</h3>
            <div className="space-y-3">
              {[
                { label: "Mã hóa mật khẩu", status: true, desc: "bcryptjs + salt rounds 10" },
                { label: "JWT Authentication", status: true, desc: "Xác thực token bảo mật" },
                { label: "RBAC Middleware", status: true, desc: "Phân quyền theo vai trò" },
                { label: "HTTPS Ready", status: false, desc: "Cần cấu hình SSL cho production" },
              ].map(({ label, status, desc }) => (
                <div key={label} className={`flex items-start gap-3 p-3 rounded-xl ${status ? "bg-green-50" : "bg-yellow-50"}`}>
                  {status ? <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0"/> : <AlertCircle size={16} className="text-yellow-500 mt-0.5 shrink-0"/>}
                  <div>
                    <div className={`text-xs font-bold ${status ? "text-green-700" : "text-yellow-700"}`}>{label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Settings size={18} className="text-gray-500"/> Thông Tin Hệ Thống</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: "Backend", val: "Node.js + Express" },
                { label: "Database", val: "MongoDB Atlas" },
                { label: "Auth", val: "JWT + bcryptjs" },
                { label: "Backup Tool", val: "mongodump" },
                { label: "Frontend", val: "React + Vite" },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-500 text-xs">{label}</span>
                  <span className="text-gray-800 font-semibold text-xs">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Backup Tips */}
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
            <h3 className="font-bold text-blue-800 mb-3 text-sm flex items-center gap-1"><AlertCircle size={16}/> Lưu Ý Sao Lưu</h3>
            <ul className="space-y-2 text-[11px] text-blue-700">
              <li className="flex items-start gap-1.5">• Backup được lưu trong thư mục <code className="bg-blue-100 px-1 rounded font-mono">backend/backups/</code></li>
              <li className="flex items-start gap-1.5">• Cần cài đặt <strong>MongoDB Database Tools</strong> để mongodump hoạt động</li>
              <li className="flex items-start gap-1.5">• Nên backup ít nhất 1 lần/ngày trên môi trường production</li>
              <li className="flex items-start gap-1.5">• Định kỳ xóa các bản backup cũ để tiết kiệm dung lượng</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirm Backup Modal */}
      {confirmBackup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HardDrive size={28} className="text-blue-600"/>
            </div>
            <h3 className="text-lg font-bold text-gray-800 text-center mb-2">Xác Nhận Sao Lưu</h3>
            <p className="text-sm text-gray-500 text-center mb-5">Quá trình sao lưu sẽ tạo một bản snapshot toàn bộ dữ liệu MongoDB. Điều này có thể mất vài phút.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmBackup(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm">Hủy</button>
              <button onClick={handleBackup} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm">Bắt Đầu Sao Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
