import { useState, useEffect } from "react";
import axios from "axios";
import {
  FileText, Loader2, Download, AlertTriangle, PieChart, TrendingUp,
  BarChart2, Users, Droplet, CheckCircle, Clock, Activity
} from "lucide-react";
import { useOutletContext } from "react-router-dom";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const BG_COLORS = {
  "A+":"#ef4444","A-":"#f87171","B+":"#3b82f6","B-":"#60a5fa",
  "AB+":"#8b5cf6","AB-":"#a78bfa","O+":"#10b981","O-":"#34d399"
};

// Simple inline bar chart component
const BarChart = ({ data, maxVal }) => (
  <div className="space-y-2">
    {data.map(({ label, value, color }) => (
      <div key={label} className="flex items-center gap-3">
        <div className="w-10 text-xs font-bold text-gray-700 text-right">{label}</div>
        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
            style={{ width: `${maxVal > 0 ? (value / maxVal) * 100 : 0}%`, backgroundColor: color || "#ef4444" }}
          >
            {value > 0 && <span className="text-white text-[10px] font-bold">{value}</span>}
          </div>
        </div>
      </div>
    ))}
  </div>
);

const AdminReports = () => {
  const { userData } = useOutletContext();
  const [reports, setReports] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get("http://localhost:5000/api/admin/reports", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(data.reports);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi tải báo cáo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reports) return;
    let csv = "data:text/csv;charset=utf-8,\uFEFF";

    // KPIs
    csv += "=== TỔNG QUAN HỆ THỐNG ===\n";
    csv += `Máu Khả Dụng,${reports.kpis?.totalAvailable}\n`;
    csv += `Máu Đã Sử Dụng,${reports.kpis?.totalUsed}\n`;
    csv += `Đang Xét Nghiệm,${reports.kpis?.totalPending}\n`;
    csv += `Đã Hết Hạn,${reports.kpis?.totalExpired}\n`;
    csv += `Tổng Người Hiến,${reports.kpis?.totalDonors}\n`;
    csv += `Tổng Chiến Dịch,${reports.kpis?.totalCamps}\n\n`;

    // Stock by group
    csv += "=== TỒN KHO THEO NHÓM MÁU ===\n";
    csv += "Nhóm Máu,Số Đơn Vị,Thể Tích (ml)\n";
    BLOOD_GROUPS.forEach(bg => {
      const d = reports.stockByGroup?.find(s => s._id === bg);
      csv += `${bg},${d?.total || 0},${d?.totalML || 0}\n`;
    });
    csv += "\n";

    // Camps
    csv += "=== CHIẾN DỊCH HIẾN MÁU ===\n";
    csv += "Tên,Ngày,Trạng Thái,Dự Kiến (người)\n";
    reports.camps?.forEach(c => {
      csv += `"${c.title}","${new Date(c.date).toLocaleDateString("vi-VN")}","${c.status}","${c.expectedDonors}"\n`;
    });

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `blood_bank_report_${Date.now()}.csv`);
    link.click();
  };

  if (userData?.role !== "superadmin" && !userData?.permissions?.includes("view_reports")) {
    return <div className="flex flex-col items-center justify-center h-96"><AlertTriangle size={64} className="text-red-400 mb-4"/><h2 className="text-2xl font-bold text-gray-800">Không có quyền truy cập</h2></div>;
  }

  const kpis = reports?.kpis || {};
  const stockByGroup = reports?.stockByGroup || [];
  const maxStock = Math.max(...BLOOD_GROUPS.map(bg => stockByGroup.find(s => s._id === bg)?.total || 0), 1);
  const donorsByBG  = reports?.donorsByBloodGroup || [];
  const maxDonors   = Math.max(...donorsByBG.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-red-50">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FileText className="text-red-600"/> Báo Cáo & Thống Kê</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng hợp toàn bộ hiệu suất vận hành hệ thống ngân hàng máu.</p>
        </div>
        <button onClick={handleExportCSV} disabled={!reports}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50">
          <Download size={16}/> Xuất CSV
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-red-600" size={32}/></div>
      ) : error ? (
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl border border-red-100">{error}</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Máu Khả Dụng", val: kpis.totalAvailable, color: "bg-green-500", icon: Droplet },
              { label: "Đã Sử Dụng",   val: kpis.totalUsed,      color: "bg-blue-500",  icon: Activity },
              { label: "Xét Nghiệm",   val: kpis.totalPending,   color: "bg-yellow-500",icon: Clock },
              { label: "Hết Hạn",      val: kpis.totalExpired,   color: "bg-red-500",   icon: AlertTriangle },
              { label: "Người Hiến",   val: kpis.totalDonors,    color: "bg-purple-500",icon: Users },
              { label: "Chiến Dịch",   val: kpis.totalCamps,     color: "bg-indigo-500",icon: CheckCircle },
            ].map(({ label, val, color, icon: Icon }) => (
              <div key={label} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                  <Icon size={18} className="text-white"/>
                </div>
                <div className="text-2xl font-black text-gray-800">{val ?? "—"}</div>
                <div className="text-[10px] text-gray-500 font-semibold uppercase mt-1">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart: Stock by Blood Group */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-50">
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart2 className="text-red-500" size={18}/> Tồn Kho Theo Nhóm Máu
              </h3>
              <BarChart
                data={BLOOD_GROUPS.map(bg => ({
                  label: bg,
                  value: stockByGroup.find(s => s._id === bg)?.total || 0,
                  color: BG_COLORS[bg]
                }))}
                maxVal={maxStock}
              />
            </div>

            {/* Chart: Donors by Blood Group */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-50">
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="text-purple-500" size={18}/> Người Hiến Theo Nhóm Máu
              </h3>
              <BarChart
                data={BLOOD_GROUPS.map(bg => ({
                  label: bg,
                  value: donorsByBG.find(d => d._id === bg)?.count || 0,
                  color: BG_COLORS[bg]
                }))}
                maxVal={maxDonors}
              />
            </div>

            {/* Requests Stats */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-50">
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PieChart className="text-blue-500" size={18}/> Tỷ Lệ Đáp Ứng Yêu Cầu
              </h3>
              {reports.requestsStats?.length > 0 ? (
                <div className="space-y-3">
                  {reports.requestsStats.map((stat, idx) => {
                    const colors = { pending: "bg-yellow-400", accepted: "bg-blue-400", completed: "bg-green-400", rejected: "bg-red-400" };
                    const labels = { pending: "Chờ duyệt", accepted: "Đã duyệt", completed: "Hoàn thành", rejected: "Từ chối" };
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${colors[stat._id] || "bg-gray-400"}`}/>
                          <span className="text-sm font-medium text-gray-700">{labels[stat._id] || stat._id}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600 text-sm">{stat.count} đơn</div>
                          <div className="text-xs text-gray-500">{stat.totalUnits} đv máu</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-gray-400 text-sm text-center py-4">Chưa có dữ liệu.</p>}
            </div>

            {/* Rejected Blood */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-50">
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="text-orange-500" size={18}/> Lý Do Hủy Máu
              </h3>
              {reports.rejectedBlood?.length > 0 ? (
                <div className="space-y-3">
                  {reports.rejectedBlood.map((item, idx) => (
                    <div key={idx} className="p-3 bg-red-50 rounded-xl border border-red-100">
                      <div className="text-xs text-gray-600 space-x-2">
                        <span>HIV: <strong className={item._id.hiv === "positive" ? "text-red-600" : "text-green-600"}>{item._id.hiv}</strong></span>
                        <span>HBV: <strong className={item._id.hbv === "positive" ? "text-red-600" : "text-green-600"}>{item._id.hbv}</strong></span>
                        <span>HCV: <strong className={item._id.hcv === "positive" ? "text-red-600" : "text-green-600"}>{item._id.hcv}</strong></span>
                      </div>
                      <div className="font-bold text-red-600 text-lg mt-1">{item.count} <span className="text-sm font-medium text-gray-500">đơn vị</span></div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm text-center py-4">Không có máu bị hủy.</p>}
            </div>
          </div>

          {/* Camps Table */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-50">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="text-green-500" size={18}/> 10 Chiến Dịch Gần Nhất
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="pb-3">Tên Chiến Dịch</th>
                  <th className="pb-3">Ngày</th>
                  <th className="pb-3">Trạng Thái</th>
                  <th className="pb-3 text-right">Mục Tiêu</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {reports.camps?.map(camp => (
                    <tr key={camp._id} className="text-sm hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-800">{camp.title}</td>
                      <td className="py-3 text-gray-500 text-xs">{new Date(camp.date).toLocaleDateString("vi-VN")}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${camp.status === "Completed" ? "bg-green-100 text-green-700" : camp.status === "Ongoing" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>
                          {camp.status}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold text-gray-700 flex items-center justify-end gap-1">
                        <Users size={12} className="text-gray-400"/>{camp.expectedDonors}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminReports;
