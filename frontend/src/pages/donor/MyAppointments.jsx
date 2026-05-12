// frontend/src/pages/donor/MyAppointments.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Clock, XCircle, Loader2, QrCode, Eye, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";

const MyAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const fetchAppointments = async () => {
    try {
      console.log("📡 Đang lấy danh sách lịch hẹn...");
      const res = await fetch("http://localhost:5000/api/donor/appointments", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      console.log("✅ Dữ liệu lịch hẹn:", data);
      
      if (data.success) {
        setAppointments(data.data || []);
      } else {
        toast.error(data.message || "Không thể tải lịch hẹn");
      }
    } catch (error) {
      console.error("❌ Fetch error:", error);
      toast.error("Lỗi nối server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAppointments();
    } else {
      setLoading(false);
      toast.error("Vui lòng đăng nhập lại");
      navigate("/login");
    }
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm("Bạn có chắc muốn hủy lịch hẹn này?")) return;
    
    setCancelling(id);
    try {
      const res = await fetch(`http://localhost:5000/api/donor/appointments/${id}/cancel`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: "Người dùng hủy" })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Đã hủy lịch hẹn thành công");
        fetchAppointments(); // Refresh danh sách
      } else {
        toast.error(data.message || "Hủy lịch thất bại");
      }
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error("Lỗi khi hủy lịch hẹn");
    } finally {
      setCancelling(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Chờ xác nhận" },
      confirmed: { bg: "bg-blue-100", text: "text-blue-700", label: "Đã xác nhận" },
      checked_in: { bg: "bg-purple-100", text: "text-purple-700", label: "Đã check-in" },
      completed: { bg: "bg-green-100", text: "text-green-700", label: "Hoàn thành" },
      cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Đã hủy" }
    };
    const s = statusMap[status] || statusMap.pending;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  // Kiểm tra xem lịch hẹn có thể hủy không (chỉ hủy được lịch trong tương lai)
  const canCancel = (appointment) => {
    const appointmentDate = new Date(appointment.appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appointment.status !== "cancelled" && 
           appointment.status !== "completed" &&
           appointmentDate >= today;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải lịch hẹn của bạn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-red-100 rounded-2xl">
              <Calendar className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Lịch hẹn hiến máu</h1>
              <p className="text-gray-600 mt-1">Theo dõi các lịch hẹn hiến máu của bạn</p>
            </div>
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Chưa có lịch hẹn nào</h3>
            <p className="text-gray-500 mb-6">Hãy đặt lịch hiến máu đầu tiên của bạn ngay hôm nay</p>
            <button
              onClick={() => navigate("/donor/book")}
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              Đặt lịch hiến máu
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((app) => {
              const isUpcoming = new Date(app.appointmentDate) >= new Date() && 
                                 app.status !== "cancelled" && 
                                 app.status !== "completed";
              
              return (
                <div key={app._id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-800">{app.camp?.title || "Điểm hiến máu"}</h3>
                          {getStatusBadge(app.status)}
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-red-500" />
                            <span>{app.camp?.location?.venue}, {app.camp?.location?.city || "Đang cập nhật"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-red-500" />
                            <span>{new Date(app.appointmentDate).toLocaleDateString("vi-VN", {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-red-500" />
                            <span>{app.appointmentTime}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {canCancel(app) && (
                          <button
                            onClick={() => handleCancel(app._id)}
                            disabled={cancelling === app._id}
                            className="flex items-center gap-1 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {cancelling === app._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            Hủy
                          </button>
                        )}
                        
                        {app.status === "confirmed" && (
                          <button
                            onClick={() => {
                              toast.success("Vui lòng xuất trình CCCD/CMND tại điểm hiến máu để check-in");
                            }}
                            className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            <QrCode className="w-4 h-4" />
                            Check-in
                          </button>
                        )}
                        
                        {app.status === "completed" && (
                          <button
                            onClick={() => navigate("/donor/history")}
                            className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            <Eye className="w-4 h-4" />
                            Chứng nhận
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lưu ý cho lịch sắp tới */}
                    {isUpcoming && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="flex items-start gap-2 text-xs text-blue-600 bg-blue-50 p-3 rounded-lg">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>
                            <span className="font-semibold">Lưu ý:</span> Nhớ ăn nhẹ, uống đủ nước và ngủ đủ giấc trước khi hiến máu. 
                            Mang theo CCCD/CMND khi đến điểm hiến máu.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAppointments;